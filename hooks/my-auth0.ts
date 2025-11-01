import Auth0, {
  LocalAuthenticationLevel,
  LocalAuthenticationOptions,
  LocalAuthenticationStrategy,
} from "react-native-auth0";

const localAuthOptions: LocalAuthenticationOptions = {
  title: "Authenticate to retrieve your credentials",
  subtitle: "Please authenticate to continue",
  description: "We need to authenticate you to retrieve your credentials",
  cancelTitle: "Cancel",
  evaluationPolicy:
    LocalAuthenticationStrategy.deviceOwnerWithBiometrics as LocalAuthenticationStrategy,
  fallbackTitle: "Use Passcode",
  authenticationLevel:
    LocalAuthenticationLevel.strong as LocalAuthenticationLevel,
  deviceCredentialFallback: true,
};

export const auth0 = new Auth0({
  domain: process.env.EXPO_PUBLIC_AUTH0_DOMAIN,
  clientId: process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID,
  LocalAuthenticationOptions: localAuthOptions as LocalAuthenticationOptions,
});
