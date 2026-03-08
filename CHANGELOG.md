# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [0.1.0] - 2026-03-08

### Added
- **VirtualTrackList component** - Renders only visible tracks for lists with 50+ items
- **Vitest testing infrastructure** - Test setup with @testing-library/react

### Changed
- **Centralized cover URL generation** - Single `getCoverUrl` function in `@bitperfect/shared/api/utils` (12 components updated)
- **Split SearchResults** - Extracted TabNavigation, TrackResults, and SkeletonRows sub-components

### Fixed
- Removed dead code (PlaybackStateContext, QueueContext)
- Fixed TypeScript `any` types in 4 files
- Removed 79 lines of commented code
