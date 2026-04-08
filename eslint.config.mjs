import antfu from '@antfu/eslint-config';

export default antfu({
  ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
  stylistic: {
    semi: true,
  },
}, {
  rules: {
    'import/consistent-type-specifier-style': 'off',
    'no-console': 'off',
    'perfectionist/sort-exports': 'off',
    'perfectionist/sort-imports': 'off',
    'perfectionist/sort-named-exports': 'off',
    'perfectionist/sort-named-imports': 'off',
    'style/arrow-parens': 'off',
    'style/brace-style': 'off',
    'style/comma-dangle': 'off',
    'style/member-delimiter-style': 'off',
    'style/semi': 'off',
    'test/consistent-test-it': 'off',
    'ts/method-signature-style': 'off',
    'unused-imports/no-unused-vars': 'off',
  },
});
