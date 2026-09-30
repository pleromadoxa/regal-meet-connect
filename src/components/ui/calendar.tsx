import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const {
    months,
    month,
    caption,
    caption_label,
    nav,
    nav_button,
    nav_button_previous,
    nav_button_next,
    table,
    head_row,
    head_cell,
    row,
    cell,
    day,
    day_range_end,
    day_selected,
    day_today,
    day_outside,
    day_disabled,
    day_range_middle,
    day_hidden,
    vhidden,
    ...restClassNames
  } = classNames ?? {};

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("w-full max-w-full p-3", className)}
      classNames={{
        months: cn("flex w-full flex-col space-y-3", months),
        month: cn("w-full min-w-0 space-y-3", month),
        caption: cn(
          "relative flex w-full items-center justify-center gap-1 pt-1",
          caption
        ),
        caption_label: cn(
          "truncate text-center text-sm font-medium",
          caption_label
        ),
        nav: cn("flex items-center gap-1", nav),
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 shrink-0 bg-transparent p-0 opacity-70 hover:opacity-100",
          nav_button
        ),
        nav_button_previous: cn("absolute left-0", nav_button_previous),
        nav_button_next: cn("absolute right-0", nav_button_next),
        table: cn("w-full border-collapse", table),
        head_row: cn("grid w-full grid-cols-7", head_row),
        head_cell: cn(
          "h-8 select-none text-center text-[0.7rem] font-normal text-muted-foreground",
          head_cell
        ),
        row: cn("mt-1 grid w-full grid-cols-7", row),
        cell: cn(
          "relative h-9 p-0 text-center text-sm focus-within:relative focus-within:z-20",
          "[&:has([aria-selected].day-range-end)]:rounded-r-md",
          "[&:has([aria-selected].day-outside)]:bg-accent/50",
          "[&:has([aria-selected])]:bg-accent",
          "first:[&:has([aria-selected])]:rounded-l-md",
          "last:[&:has([aria-selected])]:rounded-r-md",
          cell
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-full p-0 font-normal aria-selected:opacity-100",
          day
        ),
        day_range_end: cn("day-range-end", day_range_end),
        day_selected: cn(
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_selected
        ),
        day_today: cn("bg-accent text-accent-foreground", day_today),
        day_outside: cn(
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
          day_outside
        ),
        day_disabled: cn("text-muted-foreground opacity-50", day_disabled),
        day_range_middle: cn(
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_range_middle
        ),
        day_hidden: cn("invisible", day_hidden),
        // Hide DayPicker’s full weekday a11y labels (needs rdp CSS otherwise)
        vhidden: cn("sr-only", vhidden),
        ...restClassNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
