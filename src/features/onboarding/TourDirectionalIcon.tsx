import { ArrowLeft, ArrowRight } from 'lucide-react';

export function TourDirectionalIcon({
  action,
  direction,
}: {
  action: 'next' | 'back';
  direction: 'ltr' | 'rtl';
}) {
  const pointsRight = (action === 'next' && direction === 'ltr') || (action === 'back' && direction === 'rtl');
  const Icon = pointsRight ? ArrowRight : ArrowLeft;
  return <Icon aria-hidden="true" data-icon-direction={pointsRight ? 'right' : 'left'} size={18} />;
}
