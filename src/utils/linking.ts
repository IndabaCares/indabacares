import * as Linking from 'expo-linking';

export const DEEP_LINK_PREFIX = Linking.createURL('/');

export const linking = {
  prefixes: [DEEP_LINK_PREFIX, 'indabacares://'],
  config: {
    screens: {
      '(auth)': {
        screens: {
          callback: 'auth/callback',
        },
      },
    },
  },
};
