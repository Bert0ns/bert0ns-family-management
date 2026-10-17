#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Family Expense Manager - Release Preparation Script
# ==============================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# 1. Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
  echo "Error: Working directory has uncommitted changes. Please commit or stash them first."
  git status --short
  exit 1
fi

CURRENT_VER=$(node -p "require('./package.json').version")
echo "Current version: $CURRENT_VER"

TARGET_ARG="${1:-}"

if [ -z "$TARGET_ARG" ]; then
  echo ""
  echo "Select release bump type or enter exact version:"
  echo "  1) patch (bug fixes, small tweaks)"
  echo "  2) minor (new features, backward compatible)"
  echo "  3) major (breaking changes)"
  echo "  4) custom version string"
  read -r -p "Choice [1-4]: " CHOICE
  case "$CHOICE" in
    1) TARGET_ARG="patch" ;;
    2) TARGET_ARG="minor" ;;
    3) TARGET_ARG="major" ;;
    4)
      read -r -p "Enter new version (e.g. 1.1.0): " TARGET_ARG
      ;;
    *)
      echo "Invalid choice."
      exit 1
      ;;
  esac
fi

# Calculate new version
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VER"

case "$TARGET_ARG" in
  patch)
    NEW_VER="$MAJOR.$MINOR.$((PATCH + 1))"
    ;;
  minor)
    NEW_VER="$MAJOR.$((MINOR + 1)).0"
    ;;
  major)
    NEW_VER="$((MAJOR + 1)).0.0"
    ;;
  v*)
    NEW_VER="${TARGET_ARG#v}"
    ;;
  *)
    NEW_VER="$TARGET_ARG"
    ;;
esac

# Validate semver pattern
if ! [[ "$NEW_VER" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]]; then
  echo "Error: '$NEW_VER' is not a valid semantic version."
  exit 1
fi

TAG="v$NEW_VER"
echo "Target release version: $NEW_VER (Tag: $TAG)"

# Check if tag already exists
if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Error: Git tag $TAG already exists."
  exit 1
fi

echo ""
echo "Running quality verification checks before release..."
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test

echo ""
echo "Updating version in package.json and app.json..."
node -e "
const fs = require('fs');

// package.json
const pkgPath = './package.json';
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.version = '$NEW_VER';
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

// app.json
const appPath = './app.json';
const app = JSON.parse(fs.readFileSync(appPath, 'utf8'));
if (app.expo) {
  app.expo.version = '$NEW_VER';
}
fs.writeFileSync(appPath, JSON.stringify(app, null, 2) + '\n');
"

pnpm format

# Git commit and tag
git add package.json app.json
git commit -m "chore(release): $TAG"
git tag -a "$TAG" -m "Release $TAG"

echo ""
echo "Successfully created release commit and tag: $TAG"
echo ""
echo "To trigger the automated GitHub Actions Release workflow, run:"
echo "  git push origin main && git push origin $TAG"
echo ""

read -r -p "Push release to origin now? [y/N]: " PUSH_CHOICE
if [[ "$PUSH_CHOICE" =~ ^[Yy]$ ]]; then
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
  git push origin "$CURRENT_BRANCH"
  git push origin "$TAG"
  echo "Pushed branch and tag to origin. Release workflow triggered!"
fi
