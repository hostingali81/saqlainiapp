import { ProfileSkeleton } from '@/components/skeletons/ProfileSkeleton';

/** Shown the instant a member card is tapped, before the server has answered. */
export default function ProfileLoading() {
    return <ProfileSkeleton />;
}
