const gql = require('graphql-tag');

module.exports = gql`
fragment WPICLECustomFieldFragment on FieldInterface {
  id
  active
  name
  type
  ...on SelectField {
    options {
      id
      label
    }
  }
}
`;
