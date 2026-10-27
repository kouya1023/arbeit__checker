"use client";

import DropdownSelect from "./DropdownSelect";

export type Industry = { id: number; name: string; description: string | null };

type Props = {
  value: string;
  onChange: (value: string) => void;
  industries: Industry[];
  ariaLabel: string;
  triggerClassName: string;
  id?: string;
  placeholder?: string;
  allLabel?: string;
  disabled?: boolean;
};

export default function IndustrySelect({ industries, ...rest }: Props) {
  return (
    <DropdownSelect
      {...rest}
      options={industries.map((industry) => ({
        value: String(industry.id),
        label: industry.name,
        description: industry.description,
      }))}
      infoHeading="主な職種・店舗の例"
    />
  );
}
