/**
 * OIDC Service - OpenAM/AEAD SSO Integration
 *
 * Implements OpenID Connect authentication flow for:
 * - OpenAM (AEAD GobTechLab)
 * - Any OIDC-compliant identity provider
 *
 * Protocol: OAuth 2.0 + OpenID Connect 1.0
 * Features: Authorization Code Flow, PKCE, Token refresh, SCIM provisioning ready
 */

import { Issuer, generators, type Client, type TokenSet } from "openid-client";
import type { PrismaClient } from "@prisma/client";
import { signAccessToken, signRefreshToken } from "../utils/jwt.js";
import { v4 as uuidv4 } from "uuid";
import logger from "../config/logger.js";

// Environment configuration
const OIDC_ISSUER_URL = process.env["OIDC_ISSUER_URL"] ?? "";
const OIDC_CLIENT_ID = process.env["OIDC_CLIENT_ID"] ?? "";
const OIDC_CLIENT_SECRET = process.env["OIDC_CLIENT_SECRET"] ?? "";
const OIDC_REDIRECT_URI = process.env["OIDC_REDIRECT_URI"] ?? "";
const OIDC_POST_LOGOUT_REDIRECT_URI =
  process.env["OIDC_POST_LOGOUT_REDIRECT_URI"] ?? "";
const OIDC_SCOPES = process.env["OIDC_SCOPES"] ?? "openid profile email";

// PKCE state storage (in production, use Redis)
const stateStore = new Map<
  string,
  { codeVerifier: string; nonce: string; returnUrl?: string }
>();

export interface OIDCUserInfo {
  sub: string; // Subject identifier
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  preferred_username?: string;
  groups?: string[]; // For RBAC
  roles?: string[]; // For RBAC
}

interface UpsertUserResult {
  user: {
    id: string;
    email: string | null;
    name: string;
    lastName: string | null;
  };
  isNewUser: boolean;
}

export interface OIDCAuthResult {
  user: {
    id: string;
    email: string;
    name: string;
    lastName: string | null;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  isNewUser: boolean;
}

export class OIDCService {
  private client: Client | null = null;
  private issuer: Issuer | null = null;

  constructor(private prisma: PrismaClient) {}

  /**
   * Initialize OIDC client by discovering issuer configuration
   */
  async initialize(): Promise<void> {
    if (OIDC_ISSUER_URL === "") {
      logger.warn(
        "OIDC_ISSUER_URL not configured - SSO disabled. Using local auth only.",
      );
      return;
    }

    try {
      // Discover OpenID configuration from .well-known/openid-configuration
      this.issuer = await Issuer.discover(OIDC_ISSUER_URL);

      logger.info({
        event: "oidc_discovery_success",
        issuer: this.issuer.metadata.issuer,
        authorization_endpoint: this.issuer.metadata.authorization_endpoint,
        token_endpoint: this.issuer.metadata.token_endpoint,
        userinfo_endpoint: this.issuer.metadata.userinfo_endpoint,
      });

      // Create OIDC client
      this.client = new this.issuer.Client({
        client_id: OIDC_CLIENT_ID,
        client_secret: OIDC_CLIENT_SECRET,
        redirect_uris: [OIDC_REDIRECT_URI],
        response_types: ["code"],
        token_endpoint_auth_method:
          OIDC_CLIENT_SECRET !== "" ? "client_secret_basic" : "none",
      });
    } catch (error) {
      logger.error({
        event: "oidc_discovery_failed",
        error: error instanceof Error ? error.message : "Unknown error",
        issuer_url: OIDC_ISSUER_URL,
      });
      throw new Error(`Failed to initialize OIDC: ${String(error)}`);
    }
  }

  /**
   * Check if OIDC is configured and available
   */
  isConfigured(): boolean {
    return this.client !== null;
  }

  /**
   * Generate authorization URL for login redirect
   * Uses PKCE for security (even with client_secret)
   */
  getAuthorizationUrl(returnUrl?: string): {
    url: string;
    state: string;
  } {
    if (this.client === null) {
      throw new Error("OIDC not configured");
    }

    // Generate PKCE values
    const codeVerifier = generators.codeVerifier();
    const codeChallenge = generators.codeChallenge(codeVerifier);
    const state = generators.state();
    const nonce = generators.nonce();

    // Store state for callback validation
    stateStore.set(state, {
      codeVerifier,
      nonce,
      ...(returnUrl !== undefined ? { returnUrl } : {}),
    });

    // Auto-cleanup after 10 minutes
    setTimeout(() => stateStore.delete(state), 10 * 60 * 1000);

    const url = this.client.authorizationUrl({
      scope: OIDC_SCOPES,
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    return { url, state };
  }

  /**
   * Handle callback from identity provider
   * Validates tokens and creates/updates local user
   */
  async handleCallback(
    callbackUrl: string,
    state: string,
  ): Promise<OIDCAuthResult> {
    if (this.client === null) {
      throw new Error("OIDC not configured");
    }

    // Retrieve and validate stored state
    const storedState = stateStore.get(state);
    if (storedState === undefined) {
      throw new Error("Invalid or expired state parameter");
    }
    stateStore.delete(state);

    const { codeVerifier, nonce } = storedState;

    // Parse callback parameters
    const params = this.client.callbackParams(callbackUrl);

    // Exchange authorization code for tokens
    let tokenSet: TokenSet;
    try {
      tokenSet = await this.client.callback(OIDC_REDIRECT_URI, params, {
        code_verifier: codeVerifier,
        state,
        nonce,
      });
    } catch (error) {
      logger.error({
        event: "oidc_token_exchange_failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new Error("Failed to exchange authorization code");
    }

    // Get user info from ID token or userinfo endpoint
    let userInfo: OIDCUserInfo;
    try {
      // Prefer userinfo endpoint for fresh data
      userInfo = (await this.client.userinfo(tokenSet)) as OIDCUserInfo;
    } catch {
      // Fallback to ID token claims
      const claims = tokenSet.claims();
      const email = claims.email;
      const claimName = claims.name;
      const givenName = claims.given_name;
      const familyName = claims.family_name;

      userInfo = {
        sub: claims.sub,
        ...(typeof email === "string" ? { email } : {}),
        ...(typeof claimName === "string" ? { name: claimName } : {}),
        ...(typeof givenName === "string" ? { given_name: givenName } : {}),
        ...(typeof familyName === "string" ? { family_name: familyName } : {}),
      };
    }

    if (userInfo.sub === "") {
      throw new Error("No subject identifier in OIDC response");
    }

    // Create or update local user
    const { user, isNewUser } = await this.upsertUser(userInfo);

    // Create local session
    const sessionId = uuidv4();
    const accessToken = signAccessToken({ jti: sessionId, sub: user.id });
    const refreshToken = signRefreshToken({ jti: sessionId, sub: user.id });

    logger.info({
      event: "oidc_login_success",
      userId: user.id,
      email: user.email,
      isNewUser,
      oidcSub: userInfo.sub,
    });

    return {
      user: {
        id: user.id,
        email: user.email ?? "",
        name: user.name,
        lastName: user.lastName,
      },
      accessToken,
      refreshToken,
      expiresIn: 28800, // 8 hours
      isNewUser,
    };
  }

  /**
   * Generate logout URL for SSO logout
   */
  getLogoutUrl(idTokenHint?: string): string | null {
    const endSessionEndpoint = this.issuer?.metadata.end_session_endpoint;
    if (
      this.client === null ||
      endSessionEndpoint === undefined ||
      endSessionEndpoint === ""
    ) {
      return null;
    }

    const params = new URLSearchParams();
    if (idTokenHint !== undefined && idTokenHint !== "") {
      params.set("id_token_hint", idTokenHint);
    }
    if (OIDC_POST_LOGOUT_REDIRECT_URI !== "") {
      params.set("post_logout_redirect_uri", OIDC_POST_LOGOUT_REDIRECT_URI);
    }

    return `${endSessionEndpoint}?${params.toString()}`;
  }

  /**
   * Get return URL from state (for redirect after callback)
   */
  getReturnUrl(state: string): string | undefined {
    return stateStore.get(state)?.returnUrl;
  }

  /**
   * Create or update user from OIDC claims
   * Maps OIDC user info to local Profile model
   */
  private async upsertUser(userInfo: OIDCUserInfo): Promise<UpsertUserResult> {
    // Build OR conditions for finding existing user
    const orConditions: Array<{ id?: string; email?: string }> = [
      { id: userInfo.sub }, // OIDC sub as primary ID
    ];
    if (userInfo.email !== undefined) {
      orConditions.push({ email: userInfo.email });
    }

    // Try to find existing user by OIDC subject or email
    let existingUser = await this.prisma.profile.findFirst({
      where: {
        OR: orConditions,
      },
    });

    const name =
      userInfo.name ??
      userInfo.given_name ??
      userInfo.preferred_username ??
      userInfo.email ??
      "Usuario SSO";

    const lastName = userInfo.family_name ?? null;

    if (existingUser !== null) {
      // Update existing user with latest OIDC data
      existingUser = await this.prisma.profile.update({
        where: { id: existingUser.id },
        data: {
          name,
          lastName,
          active: true,
          updatedAt: new Date(),
        },
      });

      return { user: existingUser, isNewUser: false };
    }

    // Create new user
    const newUser = await this.prisma.profile.create({
      data: {
        id: userInfo.sub, // Use OIDC sub as user ID
        email: userInfo.email ?? null,
        name,
        lastName,
        active: true,
        showWizardHelp: true,
      },
    });

    // Assign default role
    await this.prisma.userRoleAssignment.create({
      data: {
        userId: newUser.id,
        role: "processor", // Default role for new SSO users
      },
    });

    return { user: newUser, isNewUser: true };
  }
}

// Singleton instance
let oidcServiceInstance: OIDCService | null = null;

export function createOIDCService(prisma: PrismaClient): OIDCService {
  oidcServiceInstance ??= new OIDCService(prisma);
  return oidcServiceInstance;
}

export function getOIDCService(): OIDCService | null {
  return oidcServiceInstance;
}
