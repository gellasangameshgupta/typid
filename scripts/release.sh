#!/bin/bash
# Safe release script for Typid
# This ensures version bump, commit, tag, and push are all in sync

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Typid Release Script ===${NC}"

# Check for uncommitted changes
if [[ -n $(git status --porcelain) ]]; then
    echo -e "${RED}Error: You have uncommitted changes. Please commit or stash them first.${NC}"
    git status --short
    exit 1
fi

# Check we're on main branch
BRANCH=$(git branch --show-current)
if [[ "$BRANCH" != "main" && "$BRANCH" != "master" ]]; then
    echo -e "${RED}Error: You must be on main/master branch to release. Currently on: $BRANCH${NC}"
    exit 1
fi

# Pull latest changes
echo -e "${YELLOW}Pulling latest changes...${NC}"
git pull origin "$BRANCH"

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "Current version: ${GREEN}$CURRENT_VERSION${NC}"

# Determine version bump type
BUMP_TYPE=${1:-patch}
if [[ "$BUMP_TYPE" != "patch" && "$BUMP_TYPE" != "minor" && "$BUMP_TYPE" != "major" ]]; then
    echo -e "${RED}Error: Invalid bump type. Use: patch, minor, or major${NC}"
    exit 1
fi

echo -e "${YELLOW}Bumping version ($BUMP_TYPE)...${NC}"

# Bump version (this also creates a git tag)
npm version "$BUMP_TYPE" -m "Release v%s"

# Get new version
NEW_VERSION=$(node -p "require('./package.json').version")
echo -e "New version: ${GREEN}$NEW_VERSION${NC}"

# Push commit and tag together
echo -e "${YELLOW}Pushing to origin...${NC}"
git push origin "$BRANCH" --tags

echo -e "${GREEN}=== Release v$NEW_VERSION initiated! ===${NC}"
echo -e "GitHub Actions will now build and publish the release."
echo -e "Monitor progress at: https://github.com/gellasangameshgupta/typid/actions"
echo ""
echo -e "Once complete, update release notes at:"
echo -e "https://github.com/gellasangameshgupta/typid/releases/tag/v$NEW_VERSION"
