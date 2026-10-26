# MeetaNotes — AI Meeting Note Taker UI Design System & Architecture Specification

## 1. Executive Summary & Design Vision

**MeetaNotes** is an ultra-premium, AI-first mobile meeting companion designed to effortlessly record, transcribe, and structure meeting discussions into actionable summaries, decisions, and checklists. 

Based on the 4-part Figma UI Kit by Lokanaka Studio ("Crafting gorgeous digital products"), this design specification establishes:
- A warm, organic color palette centered around **Coral Terracotta (`#E06D53`)**, **Forest Moss Olive (`#4D5C3B`)**, and **Warm Cream Surfaces (`#FBF9F7`)**.
- A modern card-based hierarchy with large corner radii (16–24px), subtle translucent borders, and soft natural elevation.
- A distinctive **Floating Pill Navigation Dock** with active coral capsule highlights.
- High-performance, 60fps micro-interactions built with React Native best practices, memoized components, and smooth scale transitions.

---

## 2. Color Palette & Semantic Tokens

### 2.1 Brand & Action Colors
| Token | Hex Value | Semantic Role |
| :--- | :--- | :--- |
| `coral.primary` | `#E06D53` | Primary brand accent, primary CTA buttons, active tab capsules, key indicators |
| `coral.hover` | `#C8533A` | Pressed/active state for primary coral buttons |
| `coral.light` | `#FDF4F2` | Subtle tinted card background, active badge background |
| `coral.border` | `#F3C2B6` | Border for coral-accented cards and inputs |
| `olive.primary` | `#4D5C3B` | Secondary accent, "Quick Notes" card, meeting QR banner, folder badges |
| `olive.light` | `#EBF0E6` | Light olive tag background, completion badges |
| `olive.text` | `#F4F6F1` | Text rendered on dark olive cards |
| `amber.accent` | `#F5C242` | Avatar circular frames, reminder accents, highlight chips |
| `accent.success` | `#34A853` | Completed action items checkmark, sync success |
| `accent.danger` | `#E53935` | Disconnect call, erase data, error indicators |

### 2.2 Surface & Neutral Hierarchy
| Token | Light Mode | Dark Mode | Usage |
| :--- | :--- | :--- | :--- |
| `background` | `#FBF9F7` | `#121316` | Main screen canvas, page background |
| `surface` | `#FFFFFF` | `#1C1E22` | Standard card background, modal cards |
| `surfaceElevated` | `#FFFFFF` | `#24272D` | Floating dock, popovers, active cards |
| `surfaceMuted` | `#F3EFEA` | `#1A1B1F` | Input fields, inactive filter chips, avatar wells |
| `borderSubtle` | `rgba(0, 0, 0, 0.06)` | `rgba(255, 255, 255, 0.08)` | Card outlines, dividers |
| `textPrimary` | `#191A1D` | `#F4F5F7` | Headings, titles, active labels |
| `textSecondary` | `#686B73` | `#9DA1AA` | Subtitles, timestamps, meeting URLs |
| `textMuted` | `#9EA2AA` | `#6E727C` | Placeholders, inactive icons, helper text |

---

## 3. Typography & Spacing System

- **Font Family**: System iOS (SF Pro Display / Text) & Android (Roboto / System default) with curated letter spacing and line heights.
- **Scale**:
  - `Display Title`: 28px / SemiBold 700 / letterSpacing: -0.5
  - `Screen Title`: 22px / SemiBold 700 / letterSpacing: -0.3
  - `Card Title`: 16px / SemiBold 600 / letterSpacing: -0.1 / lineHeight: 22px
  - `Body / Subtitle`: 13px / Regular 400 / lineHeight: 18px
  - `Meta / Caption`: 11px / Medium 500 / letterSpacing: 0.2
  - `Button Label`: 13px / SemiBold 600 / letterSpacing: 0.1
- **Corner Radii**:
  - Small elements (pills, chips, input fields): `12px`
  - Medium cards & modals: `20px`
  - Large container cards: `24px`
  - Circular buttons & avatars: `9999px`

---

## 4. Key Screens & UX Flow

### 4.1 Home Screen ("Hi, Launa Vendrick!")
1. **Top Header**:
   - Circular avatar with amber circle background and profile image/initials.
   - Right action buttons: Circular search button and notification bell icon with unread badge.
   - Welcome greeting: *"Hi, Launa Vendrick!"* with subtitle *"Capture today's meeting notes."*
2. **Ongoing Meeting Card**:
   - Video camera icon in soft coral rounded square.
   - Title: *"Ongoing Meeting"*, subtitle: *"Project Kickoff"*.
   - Attendee facepile: Overlapping circular avatars with red initials circle ("SA") and "+3" badge.
   - If a recording session is active: Live audio waveform and pulsing red recording indicator.
3. **Split Action Row (2 Columns)**:
   - **Next Meeting Card** (Left):
     - Title: *"Next Meeting"*, date: *"Fri, 3 Oct"*, time: *"02:00pm to 03:30pm"*.
     - Coral pill button with clock icon: *"Set Reminder"*.
   - **Quick Notes Card** (Right, Dark Olive `#4D5C3B`):
     - Title: *"Quick Notes"* with edit icon.
     - Subtitle in soft olive text: *"Save a personal reminder about this person..."*.
     - One-tap quick audio note recording or text note.
4. **Highlights From Today Section**:
   - Section header with count and "See All".
   - Meeting Checklist Cards (e.g. *"Backend System Review"* • 10:00am • 30min • Daniel Ross):
     - Interactive checklist tasks with green checkmarks `[✓]` and unchecked items `[ ]`.
     - Tapping toggles completion in real-time in `meetingStore`.

### 4.2 Scheduled Meetings & Calendar
1. **Top Bar & Actions**:
   - Title: *"Scheduled Meetings"*, search button, and "+ New Meeting" action.
2. **Horizontal Week Strip**:
   - Days of the week (`S M T W T F S`) with day numbers.
   - Active day highlighted in a bold dark pill/capsule with high contrast.
3. **Meeting List with MeetaNotes Link Badges**:
   - Time & duration pill: `"10:00 am • 30min"`, three-dot context menu.
   - Meeting title: e.g. *"Product Sync: Weekly Priorities Update Brief"*.
   - Link chip: Google Meet / Link icon + `"https://meetanotes.io/hjwhgk7..."` with 1-tap copy/open.
   - Attendee facepile cluster with "+2" / "+3" badges.
   - Instant "Record" or "Live" action button.
4. **Meeting Invitation & QR Modal**:
   - Beautiful bottom sheet modal containing meeting card in olive green with embedded QR code.
   - Copyable link input with copy button.
   - Orange full-width "Share Invitation" / "Continue" button.
5. **Date & Time Picker Bottom Sheet**:
   - Clean calendar month grid with active date in coral circle.
   - Time zone selector dropdown ("Jakarta Time Zone (GMT +07)").
   - Time selector pill buttons ("08:00 am", "09:00 am" [selected], etc.).

### 4.3 Notes & Documents ("My Notes")
1. **Header & Search**:
   - Title: *"My Notes"*, search bar, and filter chips ("All", "With Actions", "With Audio", tags).
2. **Folder Cards Carousel**:
   - Forest Green folder card: *"Team Meeting Notes & Updates"* (20 Oct 2025).
   - Dark Slate folder card: *"Project Meeting Summary"*.
3. **My Folders & Recent Files**:
   - Project folders: *"Project Beta"* (13.5 mb), *"Team Collab"* (12.2 mb).
   - Recent Files list with filetype badges: `[MP4]` audio/video recordings, `[PDF]` meeting transcripts.
4. **Structured Note Details**:
   - Executive Summary, Key Decisions, Interactive Action Items with assignees.

### 4.4 Live Meeting & Recording Experience
1. **Participant Grid**:
   - 2x2 grid of participant video/audio cards with rounded corners.
   - White circular mic status badges for each speaker.
2. **Live Transcription Floating Pill**:
   - Speech icon + real-time transcription text banner: *"We had a meeting with FDC today at 1 PM"*.
3. **Floating In-Call Dock**:
   - Mic toggle, Camera toggle, Captions/Topic recall toggle, More options, and End call/Stop button.

### 4.5 Floating Navigation Dock
- Clean, floating capsule bar elevated from the bottom screen edge.
- Active tab displays a solid coral pill (`#E06D53`) with white icon + title label:
  - `[ Home ]`, `[ Schedule ]`, `[ Record ]`, `[ Notes ]`, `[ Settings ]`.
- Inactive tabs display subtle icons with gentle tap transitions.

---

## 5. Performance Guidelines & Implementation Strategy

Following the project's `react-native-best-practices` and `vercel-react-native-skills`:
1. **Render Performance**:
   - Use `useCallback` for event handlers passed to lists and cards.
   - Use memoized components (`React.memo`) for `MeetingCard`, `ChecklistItem`, and `NoteCard`.
   - Avoid inline style object creation in render loops.
2. **Touch Feedback**:
   - Use `Pressable` with subtle transform scale (`scale: 0.98`) instead of high-opacity flickers.
3. **Safe Area & Insets**:
   - Respect `useSafeAreaInsets()` for bottom floating dock elevation and top status bar spacing.
