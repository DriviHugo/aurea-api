const data = [
  {
    id: "ab9c4d34-38fc-45f5-93ae-b3bda9e46d00",
    email: "admin@example.com",
    name: "Admin",
    lastName: "Test",
    password: "$2b$12$iW/gX4kWXoP8/3lEMuNXiumHmA068Z.MIH7ojA2KnIqqzx9m1yhB.", // password
    active: true,
  },
  {
    id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    email: "user@example.com",
    name: "User",
    lastName: "Test",
    password: "$2b$12$iW/gX4kWXoP8/3lEMuNXiumHmA068Z.MIH7ojA2KnIqqzx9m1yhB.", // password
    active: true,
  },
  {
    id: "c83d1f2a-7b4e-4a91-b6c8-2e9f0d5a3b71",
    email: "tst@aurea.com",
    name: "Test",
    lastName: "Aurea",
    password: "$2b$12$D8jhbj8KSAPnVch6VtUfKefKva13T8lZbXkVw/8rS6.xo/pMeCW/a", // Test123!
    active: true,
  },
];

export default {
  modelName: "profile",
  data,
};
