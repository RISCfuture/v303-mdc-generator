export default {
  extends: ['stylelint-config-standard'],
  rules: {
    'selector-pseudo-class-no-unknown': [
      true,
      { ignorePseudoClasses: ['deep', 'global', 'slotted'] },
    ],
    'declaration-property-value-no-unknown': null,
  },
  overrides: [
    {
      files: ['**/*.vue'],
      customSyntax: 'postcss-html',
      rules: {
        // postcss-html misparses inline `style="..."` attributes as nested
        // rules, causing false-positive `no-invalid-position-declaration`
        // errors across template attributes. Disable in .vue files.
        'no-invalid-position-declaration': null,
      },
    },
  ],
}
