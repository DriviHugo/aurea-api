module.exports = async () => {
  await global.dockerEnvironment.down();
  global.dockerEnvironment = null;
};
