module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '^.+[.](scss|css)$': '<rootDir>/__mocks__/styleMock.js',
  },
};
