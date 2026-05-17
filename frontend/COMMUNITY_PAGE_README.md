# Community Page README

This file describes what is currently shown on the `http://localhost:4200/community` page.

## Route

- Path: `/community`
- Component: `src/app/pages/community/community.component.ts`

## Page Purpose

The Community page is a social feed for candidates using InterviewPrepTN. It is designed to let users share progress, ask questions, post tips, and discover trending topics and people to follow.

## Main Layout

The page uses a two-column layout:

- Left column: main feed and post creation area
- Right column: sidebar widgets

On smaller screens:

- the layout collapses to one column
- sidebar cards move below the feed

## Header Section

At the top of the page there is:

- Title: `Community`
- Subtitle: `Connect, share, and grow together with thousands of job seekers.`
- Primary action button: `+ Create Post`

## Left Column Content

### 1. Create Post Card

The first card allows the user to start creating a post. It contains:

- the current user avatar placeholder (`AO`)
- an input field with placeholder text:
  `Share something with the community...`
- post-type quick buttons:
  - `Tip`
  - `Question`
  - `Success Story`
  - `Discussion`
- a `Post` button

This section is currently UI-only in the component and is not connected to a backend post creation flow.

### 2. Feed Filters

Below the create-post card, there is a tab-style filter row with:

- `All Posts`
- `Success Stories`
- `Questions`
- `Tips`

The first tab is marked active in the current implementation. These tabs are also currently static UI and do not yet switch the feed data.

### 3. Posts Feed

The page renders community posts from `MOCK_POSTS` in:

- `src/app/core/data/mock-data.ts`

Each post card contains:

- author avatar initials
- author name
- author title / role
- post type badge
- relative time
- post content text
- post tags
- engagement actions:
  - like count
  - comment count
  - share
  - save

If a post has comments greater than zero, the card also shows:

- one sample comment preview
- a button to view all comments

## Right Sidebar Content

### 1. Trending Topics

This card uses `TRENDING_TOPICS` from mock data and shows:

- ranked trending topics
- post counts for each topic for the week

Examples include topics like:

- `#System Design`
- `#FAANG Prep`
- `#Behavioral Interviews`

### 2. Who to Follow

This card uses `WHO_TO_FOLLOW` from mock data and shows:

- avatar initials
- person name
- person title
- `Follow` button

### 3. Community Stats

This card displays static community metrics:

- `50,247` Members
- `12,803` Posts
- `94%` Helpful rate
- `1,240` Online now

## Post Types Supported

The component recognizes these post types:

- `success`
- `discussion`
- `question`
- `tip`

These are converted to visible labels and badge styles in the component methods:

- `typeLabel(type: string)`
- `typeChip(type: string)`

## Data Sources

The page currently depends on mock data only:

- `MOCK_POSTS`
- `TRENDING_TOPICS`
- `WHO_TO_FOLLOW`

All are imported from:

- `src/app/core/data/mock-data.ts`

## Current Behavior Notes

- The page is presentational and mock-data driven.
- Create post, follow, like, comment, share, and save actions are not wired to backend APIs yet.
- Filter tabs are static and do not currently change the list of posts.
- The page is responsive through component-level CSS media queries.

## Related File

- `src/app/pages/community/community.component.ts`
