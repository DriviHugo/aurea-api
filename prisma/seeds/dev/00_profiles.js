const data = [
  {
    id: "ab9c4d34-38fc-45f5-93ae-b3bda9e46d00",
    email: "admin@example.com",
    name: "Admin",
    lastName: "Test",
    password: "$2b$12$LIqtpSWxpiL1QeNs/Jcpr.vYcYSDAXqg4aKZP.MO0AlYWrn6U4YYu", // password
    active: true,
  },
  {
    id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    email: "user@example.com",
    name: "User",
    lastName: "Test",
    password: "$2b$12$LIqtpSWxpiL1QeNs/Jcpr.vYcYSDAXqg4aKZP.MO0AlYWrn6U4YYu", // password
    active: true,
  },
];

export default {
  modelName: "profile",
  data,
};
