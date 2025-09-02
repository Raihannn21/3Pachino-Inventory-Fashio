"use client";

import { useState } from 'react';
import { DayPicker, DateRange } from 'react-day-picker';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { id } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

import 'react-day-picker/dist/style.css';

interface DateRangePickerProps {
  onDateRangeChange: (range: { from: Date; to: Date } | null) => void;
  className?: string;
}

const presets = [
  {
    label: '7 Hari Terakhir',
    value: 7,
    range: () => ({
      from: startOfDay(subDays(new Date(), 6)),
      to: endOfDay(new Date())
    })
  },
  {
    label: '30 Hari Terakhir', 
    value: 30,
    range: () => ({
      from: startOfDay(subDays(new Date(), 29)),
      to: endOfDay(new Date())
    })
  },
  {
    label: '90 Hari Terakhir',
    value: 90,
    range: () => ({
      from: startOfDay(subDays(new Date(), 89)),
      to: endOfDay(new Date())
    })
  }
];

export function DateRangePicker({ onDateRangeChange, className }: DateRangePickerProps) {
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>();
  const [selectedPreset, setSelectedPreset] = useState(presets[0]);
  const [open, setOpen] = useState(false);

  const handlePresetClick = (preset: typeof presets[0]) => {
    const range = preset.range();
    setSelectedRange(range);
    setSelectedPreset(preset);
    onDateRangeChange(range);
    setOpen(false);
  };

  const handleDateSelect = (range: DateRange | undefined) => {
    setSelectedRange(range);
    if (range?.from && range?.to) {
      onDateRangeChange({
        from: startOfDay(range.from),
        to: endOfDay(range.to)
      });
      setSelectedPreset({ label: 'Custom', value: 0, range: () => range as { from: Date; to: Date } });
    }
  };

  const formatDateRange = () => {
    if (selectedRange?.from && selectedRange?.to) {
      if (selectedPreset.value > 0) {
        return selectedPreset.label;
      } else {
        return `${format(selectedRange.from, 'dd MMM yyyy', { locale: id })} - ${format(selectedRange.to, 'dd MMM yyyy', { locale: id })}`;
      }
    }
    return selectedPreset.label;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-between text-left font-normal",
            !selectedRange && "text-muted-foreground",
            className
          )}
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {formatDateRange()}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Preset buttons */}
          <div className="flex flex-col gap-1 p-3 border-r">
            {presets.map((preset) => (
              <Button
                key={preset.value}
                variant={selectedPreset.value === preset.value ? "default" : "ghost"}
                size="sm"
                onClick={() => handlePresetClick(preset)}
                className="justify-start text-left whitespace-nowrap"
              >
                {preset.label}
              </Button>
            ))}
          </div>
          
          {/* Calendar */}
          <div className="p-3">
            <DayPicker
              mode="range"
              selected={selectedRange}
              onSelect={handleDateSelect}
              numberOfMonths={2}
              locale={id}
              className="border-0"
              classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                month: "space-y-4",
                caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-sm font-medium",
                nav: "space-x-1 flex items-center",
                nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse space-y-1",
                head_row: "flex",
                head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                row: "flex w-full mt-2",
                cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                day_today: "bg-accent text-accent-foreground",
                day_outside: "text-muted-foreground opacity-50",
                day_disabled: "text-muted-foreground opacity-50",
                day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                day_hidden: "invisible",
              }}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
