import type { Metadata } from 'next';
import WheelPicker from '@/components/wheel/WheelPicker';

export const metadata: Metadata = {
  title: 'Wheel Picker — Game Hub',
  description: 'A spin-the-wheel prize picker game',
};

export default function WheelPickerPage() {
  return <WheelPicker />;
}
