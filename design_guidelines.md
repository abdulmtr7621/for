# Qube IA Forum - Design Guidelines

## Design Approach
**Reference-Based: Discord + Gaming Community Aesthetic**
Drawing from Discord's interface patterns with Pika Network's vibrant gaming personality. This is a utility-focused forum requiring clear information hierarchy and role-based visual distinction.

---

## Typography System
**Font Families:**
- Primary/Headings: Palanquin Dark (bold, gaming-appropriate)
- Body Text: Palanquin (regular weight for readability)
- CDN: Google Fonts

**Hierarchy:**
- H1: 32px (forum section titles, page headers)
- H2: 24px (post titles, subsection headers)
- H3: 20px (role badges, category labels)
- Body: 16px (post content, descriptions)
- Small: 14px (timestamps, metadata, user IDs)
- Tiny: 12px (helper text, status indicators)

---

## Layout System
**Spacing Primitives:** Tailwind units of 2, 3, 4, 6, 8, 12, 16
- Component padding: p-4 to p-6
- Section margins: my-8 to my-12
- Card spacing: gap-4
- List items: space-y-3

**Grid Structure:**
- Main container: max-w-7xl mx-auto
- Two-column layout: Sidebar (280px fixed) + Main content (flex-1)
- Post grid: Single column for readability
- User cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3

---

## Color Application (Dark Theme)

**Role-Specific Accent Colors:**
- Helper: Blue (#3B82F6)
- Moderator: Green (#10B981)
- Admin: Orange (#F59E0B)
- Developer: Cyan (#06B6D4)
- Owner: Purple (#7E31E3)

**Usage:**
- Dark backgrounds: #1E1F22 (primary), #2B2D31 (secondary), #313338 (tertiary)
- Role badges: Use role colors as background with white text
- Buttons: Primary uses #7E31E3, accent actions use #FCEB38
- Text on dark: White (#FFFFFF), gray (#B5BAC1) for secondary
- Borders: #404249 (subtle dividers)
- Hover states: Lighten background by 5-10%

---

## Component Library

### Navigation
**Top Bar (Fixed):**
- Height: 60px
- Contains: Qube IA logo (avatar + text), main navigation tabs, user profile dropdown
- Sticky navigation with subtle bottom border

**Sidebar (Left):**
- Forum sections as collapsible categories
- Active section highlighted with left border accent (#7E31E3)
- Section icons using Heroicons (solid variant)
- Role-filtered sections dimmed/hidden based on permissions

### Forum Posts & Cards
**Post Container:**
- Rounded corners: rounded-lg (8px)
- Padding: p-6
- Background: #2B2D31
- Border: 1px solid #404249
- Hover: subtle background lift to #313338

**Post Header:**
- Avatar (40px circular) + Username + Role badge + Timestamp
- Role badge: rounded-full px-3 py-1 with role-specific background

**Post Actions:**
- Icon buttons (24px): Reply, Report, Delete (role-based visibility)
- Float right on hover for cleaner initial view

### Forms & Inputs
**Input Fields:**
- Background: #383A40
- Border: 1px solid #404249, focus border #7E31E3
- Border radius: rounded-lg (8px)
- Padding: px-4 py-3
- Placeholder text: #6D6F78

**Buttons:**
- Primary: bg-[#7E31E3] text-white rounded-md px-6 py-2.5
- Secondary: bg-[#FCEB38] text-[#1E1F22] rounded-lg px-6 py-2.5
- Danger: bg-red-600 text-white (for delete actions)
- Ghost: Transparent with border for tertiary actions

### Badges & Tags
**Role Badges:**
- Pill shape: rounded-full
- Small size: text-xs px-2.5 py-0.5
- Use role-specific colors with white text
- Position: Next to username

**Status Tags:**
- Bug report tags: "Fixed" (green), "Invalid" (red), "Pending" (yellow)
- Ticket status: "Open", "Solved", "Unsolved"
- Rectangular: rounded-md px-2 py-1 text-xs

### Data Display
**User Profile Card:**
- Avatar (120px), banner image (16:9 aspect, height-32)
- Username + User ID (smaller, monospace font)
- Role badge prominently displayed
- Stats row: Posts created, Messages sent

**Developer Panel:**
- Bug reports table with columns: ID, Title, Status, Reported By, Date
- Auto-forwarded indicator (small purple dot)
- Developer chat zone: Discord-style message thread at bottom

### Modals & Overlays
**Report/Ticket Modal:**
- Centered overlay with backdrop blur
- Max width: max-w-2xl
- Form fields with clear labels
- Submit at bottom-right

---

## Icons
**Library:** Heroicons (via CDN)
- Navigation: outline variant
- Actions: solid variant (20px)
- Status indicators: mini variant (16px)

**Key Icons:**
- Forum sections: ChatBubbleLeftIcon, CodeBracketIcon, BugAntIcon
- User actions: PencilIcon, TrashIcon, FlagIcon
- Roles: ShieldCheckIcon, WrenchScrewdriverIcon

---

## Animations
**Minimal & Purposeful:**
- Hover states: transition-colors duration-200
- Modal entry: fade-in with slight scale (200ms)
- Sidebar collapse: transition-transform duration-300
- NO scroll animations, parallax, or decorative effects

---

## Images
**Hero Section:** None - this is a utility dashboard, not a marketing page

**Avatar/Branding:**
- Qube IA avatar displayed in top-left (48px circular)
- User avatars throughout (40px standard, 120px profile)
- Default avatar: Initials on purple gradient background

**Illustrations:** None needed for forum functionality

---

## Responsive Behavior
- Mobile (< 768px): Hide sidebar, add hamburger menu
- Tablet (768px-1024px): Collapsible sidebar (icons only)
- Desktop (> 1024px): Full sidebar always visible