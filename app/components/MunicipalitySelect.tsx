"use client";

import DropdownSelect from "./DropdownSelect";

export type Municipality = { id: number; name: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  municipalities: Municipality[];
  ariaLabel: string;
  triggerClassName: string;
  id?: string;
  placeholder?: string;
  allLabel?: string;
  disabled?: boolean;
};

export default function MunicipalitySelect({ municipalities, ...rest }: Props) {
  return (
    <DropdownSelect
      {...rest}
      options={municipalities.map((municipality) => ({
        value: String(municipality.id),
        label: municipality.name,
      }))}
    />
  );
}
