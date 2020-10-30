# vendors

API clients for 3rd party vendors

# Github packages

## Authentication

Authenticate with a personal access token:
<https://help.github.com/en/packages/using-github-packages-with-your-projects-ecosystem/configuring-npm-for-use-with-github-packages#authenticating-with-a-personal-access-token>

Obtain personal access token:
<https://help.github.com/en/github/authenticating-to-github/creating-a-personal-access-token>

## Configuring npm for use with GitHub Packages

<https://help.github.com/en/packages/using-github-packages-with-your-projects-ecosystem/configuring-npm-for-use-with-github-packages>

Read:
<https://help.github.com/en/packages/using-github-packages-with-your-projects-ecosystem/configuring-npm-for-use-with-github-packages#publishing-a-package-using-a-local-npmrc-file>

# Openapi generator

## Generate typescript client from openapi specification

```
./bin/generate-client.sh
```

The above script uses openapi-generator tool for typescript. Read about more typescript options at:
<https://openapi-generator.tech/docs/generators/typescript-node>

**Note:** The script configures `package.json` so npm package is published at GitHub Packages as private.

# Npm packages

## Publish client package

Go to vendor directory and run:

```
npm publish
```

# Troubleshooting

## Npm publish

```
npm ERR! Invalid version: "2.0"
```

Solution: Update version in api spec to make it conform with semver. E.g.: change version to `2.0.0` and then generate
client once again.
