'use client';

import { useState } from 'react';
import { User } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Camera, Trash2 } from 'lucide-react';
import { PhotoUploadModal } from '@/components/PhotoUploadModal';
import { getPhotoUrl } from '@/lib/utils';

interface PhotoManagementProps {
    users: User[];
}

export function PhotoManagement({ users }: PhotoManagementProps) {
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [photoModalOpen, setPhotoModalOpen] = useState(false);

    const selectedUser = users.find(u => u.id.toString() === selectedUserId);

    // Convert users to options format
    const userOptions = users.map(u => ({
        value: u.id.toString(),
        label: `${u.name} - ${u.fname}`,
        image: u.hasImage ? getPhotoUrl(u.id, 'small') : `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&size=32&background=0D483B&color=FFF8E7&bold=true`
    }));

    const hasImage = selectedUser?.hasImage;
    const currentImageUrl = selectedUser
        ? (hasImage
            ? `${getPhotoUrl(selectedUser.id, 'large')}?v=${Date.now()}`
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.name)}&bold=true&color=666&size=300`)
        : '';

    const handleDelete = async () => {
        if (!selectedUser) return;

        if (!confirm('Are you sure you want to delete this photo?')) return;

        try {
            const response = await fetch('/api/admin/delete-photo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: selectedUser.id })
            });

            const data = await response.json();

            if (data.success) {
                alert('Photo deleted successfully!');
                window.location.reload();
            } else {
                alert('Failed to delete photo');
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Error deleting photo');
        }
    };

    return (
        <>
            <Card className="w-full max-w-lg mx-auto border-t-4 border-t-primary">
                <CardHeader>
                    <CardTitle>Photo Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Searchable User Select */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Select User</label>
                        <SearchableSelect
                            options={userOptions}
                            value={selectedUserId}
                            onChange={setSelectedUserId}
                            placeholder="Search and select user..."
                        />
                    </div>

                    {/* Current Photo Display */}
                    {selectedUser && (
                        <div className="space-y-4">
                            <div className="text-center">
                                <p className="text-sm font-medium mb-2">Current Photo</p>
                                <div className="flex justify-center">
                                    <img
                                        src={currentImageUrl}
                                        alt={selectedUser.name}
                                        className="w-40 h-40 rounded-full object-cover border-4 border-gray-200"
                                        loading="eager"
                                    />
                                </div>
                                <p className="text-sm text-muted-foreground mt-2">
                                    {selectedUser.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {selectedUser.fname}
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => setPhotoModalOpen(true)}
                                    className="flex-1"
                                    variant="default"
                                >
                                    <Camera className="h-4 w-4 mr-2" />
                                    Change Photo
                                </Button>
                                {hasImage && (
                                    <Button
                                        onClick={handleDelete}
                                        variant="destructive"
                                        className="flex-1"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete Photo
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Photo Upload Modal */}
            <PhotoUploadModal
                user={selectedUser || null}
                isOpen={photoModalOpen}
                onClose={() => setPhotoModalOpen(false)}
                onSuccess={() => {
                    window.location.reload();
                }}
            />
        </>
    );
}
