

# Refactor: Leaderboard puzzle-type navigation

## Change

Replace the horizontal scrolling tab list (lines 318–347) with two buttons: "Overall" (filled when active) and a "Puzzle Type" dropdown.

## Implementation

**File:** `src/pages/Leaderboard.tsx`

**1. Add import** for `DropdownMenu` components:
```tsx
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
```

**2. Replace lines 318–347** (the scroll tab section) with:
```tsx
<div className="flex items-center gap-2 mb-5">
  <Button
    variant={isGlobal ? "default" : "outline"}
    size="sm"
    onClick={() => setActiveTab("global")}
  >
    Overall
  </Button>
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant={!isGlobal ? "default" : "outline"} size="sm">
        {isGlobal ? "Puzzle Type" : typeLabel}
        <ChevronDown size={14} className="ml-1.5" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start">
      {PUZZLE_TYPES.map((pt) => (
        <DropdownMenuItem
          key={pt}
          onClick={() => setActiveTab(pt)}
          className={cn(activeTab === pt && "font-semibold")}
        >
          {CATEGORY_INFO[pt]?.name}
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
</div>
```

**Behavior:**
- "Overall" is a filled button when `isGlobal` is true, outlined otherwise
- Dropdown button shows "Puzzle Type" when on Overall, or the selected type name when a type is active — filled when a type is selected
- Selecting a type sets `activeTab`, closes dropdown automatically (Radix default)
- No horizontal scroll, no wrapping, no layout shift
- All existing query logic (`activeTab`, `isGlobal`, `puzzleType`) unchanged

One file, one section replaced. No backend changes.

