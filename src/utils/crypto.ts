import bcrypt from "bcrypt";
import crypto from "crypto";

const SALT_ROUNDS = 12;

export function validatePasswordHash(
  password: string,
  hash: string,
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    bcrypt.compare(password, hash, (err, result) => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (err !== null) {
        reject(new Error("Error comparing passwords"));
      } else {
        resolve(result);
      }
    });
  });
}

export function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    bcrypt.hash(password, SALT_ROUNDS, function (err, hash) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (err !== null) {
        reject(new Error("Error hashing password"));
      } else {
        resolve(hash);
      }
    });
  });
}

export function generateRandomHexToken(length: number): string {
  return crypto.randomBytes(length).toString("hex");
}
