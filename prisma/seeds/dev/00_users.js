const data = [
  {
    id: "ab78epx4n4cx1gkekf9jje91",
    email: "john.doe@example.com",
    name: "John Doe",
    password: "$2b$12$iW/gX4kWXoP8/3lEMuNXiumHmA068Z.MIH7ojA2KnIqqzx9m1yhB.", // password
    isActive: true,
    validatedAt: new Date("2025-01-01T00:00:00Z"),
  },
  {
    id: "qyyj7kytddb4gqxkg3byboik",
    email: "admin@example.com",
    isAdmin: true,
    password: "$2b$12$iW/gX4kWXoP8/3lEMuNXiumHmA068Z.MIH7ojA2KnIqqzx9m1yhB.", // password
    name: "Admin Doe",
    isActive: true,
    validatedAt: new Date("2025-01-01T00:00:00Z"),
  },
];

export default {
  modelName: "userEntity",
  data,
};
