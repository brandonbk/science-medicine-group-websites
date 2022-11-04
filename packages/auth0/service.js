const Joi = require('@parameter1/joi');
const { validate } = require('@parameter1/joi/utils');
const fetch = require('node-fetch');
const debug = require('debug')('auth0');

class Auth0 {
  constructor(params = {}) {
    const {
      clientId,
      issuerBaseURL,
      secret,
    } = validate(Joi.object({
      clientId: Joi.string().required().description('The Auth0 client id'),
      issuerBaseURL: Joi.string().uri().description('The Auth0 tenant URL'),
      secret: Joi.string().required().description('The Auth0 client secret'),
    }), params);
    this.clientId = clientId;
    this.issuerBaseURL = issuerBaseURL;
    this.secret = secret;
  }

  /**
   * Handles the internal short-lived authentication token
   */
  async getToken() {
    if (!this.token) this.token = await this.fetchToken();
    return this.token;
  }

  /**
   * Retrieves a new Management API token
   */
  async fetchToken() {
    const url = `${this.issuerBaseURL}/oauth/token`;
    const r = await fetch(url, {
      method: 'post',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.secret,
        audience: `${this.issuerBaseURL}/api/v2/`,
      }),
    });
    const response = await r.json();
    debug('fetchToken', response);
    if (!r.ok || !response.access_token) throw new Error(`API request was unsuccessful: ${r.status} ${r.statusText}`);
    return response.access_token;
  }

  /**
   * Makes a request against the Auth0 API
   * @param {*} endpoint The A0 APi endpoint to request
   * @param {*} opts Additional fetch args
   * @returns Promise
   */
  async request(endpoint, opts = {}) {
    const method = opts.method || 'post';
    const token = await this.getToken();
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const url = `${this.issuerBaseURL}/${endpoint}`;
    const r = await fetch(url, { method, headers, ...opts || {} });
    const response = await r.json();
    if (!r.ok) {
      debug(`${method.toUpperCase()} ${url} ERR`, { headers, ...opts || {}, response });
      if (response.message) throw new Error(response.message);
      throw new Error(`API request was unsuccessful: ${r.status} ${r.statusText}`);
    }
    debug(`${method.toUpperCase()} ${url} OK`, { headers, ...opts || {}, response });
    return response;
  }

  /**
   * Sends a verification email to the specified user
   * @see https://auth0.com/docs/api/management/v2#!/Jobs/post_verification_email
   * @param {String} userId The Auth0 user id (idToken.sub)
   * @returns Promise
   */
  sendVerificationEmail(userId) {
    return this.request('api/v2/jobs/verification-email', {
      body: JSON.stringify({ user_id: userId, client_id: this.clientId }),
    });
  }
}

module.exports = Auth0;
