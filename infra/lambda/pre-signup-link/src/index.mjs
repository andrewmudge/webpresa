import { CognitoIdentityProviderClient, ListUsersCommand, AdminLinkProviderForUserCommand } from '@aws-sdk/client-cognito-identity-provider';

// Cognito Pre Sign-up trigger. Fires on every sign-up attempt (native and
// federated) — this handler only does anything on a federated attempt,
// and only when a native (password) user with the same, verified email
// already exists in the pool. In that case it links the incoming federated
// identity to the existing user via AdminLinkProviderForUser *before*
// Cognito would otherwise create a brand-new pool user for it, so the
// sign-in that completes right after this trigger resolves to the
// existing user's `sub` — no duplicate account, no app-side code needed
// (Business.ownerUserId is keyed on `sub`, not email).
//
// event.userName for a federated attempt is shaped "{ProviderName}_{providerUserId}",
// e.g. "Google_108234...". A native user's Username is Cognito's own
// auto-generated sub (no provider prefix) — used below to tell native and
// federated users apart in the ListUsers results.
const SUB_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const client = new CognitoIdentityProviderClient({});

export const handler = async (event) => {
  if (event.triggerSource !== 'PreSignUp_ExternalProvider') {
    return event;
  }

  const email = event.request?.userAttributes?.email;
  const emailVerified = event.request?.userAttributes?.email_verified === 'true';
  if (!email || !emailVerified) {
    return event;
  }

  const separatorIndex = event.userName.indexOf('_');
  if (separatorIndex === -1) {
    return event;
  }
  const providerName = event.userName.slice(0, separatorIndex);
  const providerUserId = event.userName.slice(separatorIndex + 1);

  const existing = await client.send(
    new ListUsersCommand({
      UserPoolId: event.userPoolId,
      Filter: `email = "${email}"`,
      Limit: 10,
    }),
  );

  const nativeUser = (existing.Users ?? []).find((user) => user.Username && SUB_LIKE.test(user.Username));
  if (!nativeUser) {
    // No prior password account with this email — let Cognito create a
    // normal new federated user (expected for Google-first signups).
    return event;
  }

  await client.send(
    new AdminLinkProviderForUserCommand({
      UserPoolId: event.userPoolId,
      DestinationUser: {
        ProviderName: 'Cognito',
        ProviderAttributeValue: nativeUser.Username,
      },
      SourceUser: {
        ProviderName: providerName,
        ProviderAttributeName: 'Cognito_Subject',
        ProviderAttributeValue: providerUserId,
      },
    }),
  );

  return event;
};
