<template>
  <div id="content-access-idx-form" class="content-page-gate p-block">
    <template v-if="hasActiveUser">
      <h5 class="content-page-gate__title">
        {{ title }}
      </h5>
      <p v-if="!didSubmit" v-html="callToAction" />
      <form v-if="!didSubmit" @submit.prevent="handleSubmit">
        <fieldset :disabled="isLoading">
          <div v-for="(row, ridx) in fieldRows" :key="ridx" class="row">
            <custom-column
              v-for="(col, cidx) in row"
              :key="`${ridx}_${cidx}`"
              :label="col.label || defaultFieldLabels[col.key]"
              :field-key="col.key"
              :field-id="col.id"
              :type="col.type"
              :required="col.required"
              :width="col.width || 1"
              :user="user"
              :endpoints="endpoints"
              :enable-change-email="enableChangeEmail"
            />
          </div>

          <form-consent
            :user="user"
            :consent-policy="consentPolicy"
            :consent-policy-enabled="consentPolicyEnabled"
            :email-consent-request="emailConsentRequest"
            :email-consent-request-enabled="emailConsentRequestEnabled"
            :regional-consent-policies="regionalConsentPolicies"
            :country-code="countryCode"
          />

          <div class="d-flex align-items-center">
            <button type="submit" class="btn btn-primary">
              {{ buttonLabel }}
            </button>
          </div>
        </fieldset>
        <p v-if="error" class="mt-3 text-danger">
          An error occurred: {{ error }}
        </p>
      </form>

      <template v-else>
        <div class="success-message">
          <p class="success-message__title">
            Your responses have been saved, and your download should begin automatically.
          </p>
          <p class="success-message__title d-flex justify-content-between">
            If not, click this button to start:
            <a
              class="btn btn-primary mr-3"
              :href="content.fileSrc"
              target="_blank"
            >Download</a>
          </p>
          <download-related :content="content" @submit="download" />
        </div>
      </template>
    </template>

    <div v-else>
      <p v-html="callToActionLoggedOut" />
      <login
        :additional-event-data="additionalEventData"
        :source="loginSource"
        :endpoints="endpoints"
        :app-context-id="appContextId"
        :consent-policy="consentPolicy"
        :consent-policy-enabled="consentPolicyEnabled"
        :email-consent-request="emailConsentRequest"
        :email-consent-request-enabled="emailConsentRequestEnabled"
        :regional-consent-policies="regionalConsentPolicies"
        :required-create-fields="requiredCreateFields"
        :default-field-labels="defaultFieldLabels"
      />
    </div>
  </div>
</template>

<script>
import cookies from 'js-cookie';
import post from '@parameter1/base-cms-marko-web-identity-x/browser/utils/post';
import cookiesEnabled from '@parameter1/base-cms-marko-web-identity-x/browser/utils/cookies-enabled';

import FormConsent from '@parameter1/base-cms-marko-web-identity-x/browser/form/consent.vue';
import CustomColumn from '@parameter1/base-cms-marko-web-identity-x/browser/custom-column.vue';
import Login from '@parameter1/base-cms-marko-web-identity-x/browser/login.vue';

import FeatureError from '@parameter1/base-cms-marko-web-identity-x/browser/errors/feature';
import FormError from '@parameter1/base-cms-marko-web-identity-x/browser/errors/form';
import EventEmitter from '@parameter1/base-cms-marko-web-identity-x/browser/mixins/global-event-emitter';
import DownloadRelated from '@parameter1/base-cms-marko-web-identity-x/browser/download-related.vue';

export default {
  components: {
    CustomColumn,
    DownloadRelated,
    FormConsent,
    Login,
  },

  /**
   *
   */
  mixins: [EventEmitter],

  /**
   *
   */
  props: {
    /**
     * custom form props
     */
    content: {
      type: Object,
      required: true,
    },
    fieldRows: {
      type: Array,
      required: true,
    },
    title: {
      type: String,
      default: 'Complete the form to access this content',
    },
    callToAction: {
      type: String,
      default: 'To access this content, please fill out the form below.',
    },
    callToActionLoggedOut: {
      type: String,
      default: 'To access this content, please enter your email address below.',
    },

    /**
     * profile/login props
     */
    loginSource: {
      type: String,
      default: 'contentAccess',
    },
    endpoints: {
      type: Object,
      required: true,
    },
    activeUser: {
      type: Object,
      default: () => ({}),
    },
    requiredCreateFields: {
      type: Array,
      default: () => [],
    },
    cookie: {
      type: Object,
      required: true,
    },
    defaultFieldLabels: {
      type: Object,
      default: () => {},
    },
    consentPolicy: {
      type: String,
      default: null,
    },
    consentPolicyEnabled: {
      type: Boolean,
      default: false,
    },
    emailConsentRequest: {
      type: String,
      default: null,
    },
    emailConsentRequestEnabled: {
      type: Boolean,
      default: false,
    },
    appContextId: {
      type: String,
      default: null,
    },
    buttonLabel: {
      type: String,
      default: 'Submit & Access',
    },
    regionalConsentPolicies: {
      type: Array,
      default: () => [],
    },
    defaultCountryCode: {
      type: String,
      default: null,
    },
    enableChangeEmail: {
      type: Boolean,
      default: false,
    },
  },

  /**
   *
   */
  data() {
    return {
      error: null,
      isLoading: false,
      isReloadingPage: false,
      isRedirectingPage: false,
      didSubmit: false,
      user: {
        ...this.activeUser,
        ...(this.defaultCountryCode
          && !this.activeUser.countryCode
          && { countryCode: this.defaultCountryCode }
        ),
      },
    };
  },

  /**
   *
   */
  computed: {
    /**
     *
     */
    hasActiveUser() {
      return this.user && this.user.email;
    },

    /**
     *
     */
    countryCode() {
      if (this.user && this.user.countryCode) return this.user.countryCode;
      return this.defaultCountryCode;
    },
  },

  /**
   *
   */
  mounted() {
    console.warn(this.cookie);
    if (cookiesEnabled()) {
      this.emit('content-access-mounted');
    } else {
      const error = new FeatureError('Your browser does not support cookies. Please enable cookies to use this feature.');
      this.error = error.message;
      this.emit('content-access-errored', { message: error.message });
    }
  },

  /**
   *
   */
  methods: {

    /**
     *
     */
    async handleSubmit() {
      this.error = null;
      this.isLoading = true;
      this.didSubmit = false;
      console.log(this.user);
      try {
        const additionalEventData = { ...this.additionalEventData, actionSource: this.loginSource };
        const res = await post('/profile', { ...this.user, additionalEventData });
        const data = await res.json();
        if (!res.ok) throw new FormError(data.message, res.status);

        this.user = data.user;
        const { content } = this;
        this.emit('content-access-submitted', {
          contentId: content.id,
          contentType: content.type,
          userId: this.user.id,
          additionalEventData,
        });
        const { cookie } = this;
        cookies.set(cookie.name, true, { expires: cookie.maxAge });

        this.didSubmit = true;

        window.location.reload(true);
      } catch (e) {
        this.error = e;
        this.emit('content-access-errored', { message: e.message });
      } finally {
        this.isLoading = false;
      }
    },

  },
};
</script>
