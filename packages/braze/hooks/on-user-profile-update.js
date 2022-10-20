const { get, getAsArray, getAsObject } = require('@parameter1/base-cms-object-path');

const getFormatter = v => (typeof v === 'function' ? v : x => x.payload);
const filterByExternalId = (arr, type, tenant) => arr.filter((v) => {
  const ns = getAsObject(v, 'field.externalId.namespace');
  return ns.provider === 'braze' && ns.type === type && ns.tenant === tenant;
});

/**
 *
 */
module.exports = async ({
  brazeConfig,
  user,
  service,
}) => {
  const { tenant, fieldMap } = brazeConfig;
  const { braze } = service.req;
  const payload = {
    external_id: user.id,
    ...Object.keys(fieldMap).reduce((obj, k) => {
      const key = fieldMap[k];
      const val = get(user, k);
      return { ...obj, ...(val && { [key]: val }) };
    }, {}),
  };

  // External ID tagged questions
  const questions = filterByExternalId(getAsArray(user, 'customSelectFieldAnswers'), 'attribute', tenant);
  questions.forEach((ans) => {
    if (ans.hasAnswered) {
      const key = get(ans, 'field.externalId.identifier.value');
      const answers = getAsArray(ans, 'answers').map(a => a.writeInValue || a.externalIdentifier);
      payload[key] = ans.field.multiple ? answers : answers.pop();
    }
  });

  const formatter = getFormatter(brazeConfig.onUserProfileUpdateFormatter);
  await braze.trackUser(user.email, user.id, await formatter({ service, payload }));

  // External ID tagged subscriptions
  const optins = filterByExternalId(getAsArray(user, 'customBooleanFieldAnswers'), 'subscriptionGroup', tenant);
  if (optins.length) {
    const subscriptions = optins.reduce((obj, ans) => {
      const key = get(ans, 'field.externalId.identifier.value');
      return { ...obj, [key]: ans.value };
    }, {});

    await braze.updateSubscriptions(user.email, user.id, subscriptions);
  }

  return user;
};