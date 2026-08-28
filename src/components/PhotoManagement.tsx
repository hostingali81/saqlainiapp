'use client';

import { useState } from 'react';
import { User } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Camera, Trash2 } from 'lucide-react';
import { PhotoUploadModal } from '@/components/PhotoUploadModal';
import { applyAvatarFallback, getPhotoUrl } from '@/lib/utils';

interface PhotoManagementProps {
    users: User[];
}

export function PhotoManagement({ users }: PhotoManagementProps) {
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [photoModalOpen, setPhotoModalOpen] = useState(false);
    const [imageKey, setImageKey] = useState(0);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const selectedUser = users.find(u => u.id.toString() === selectedUserId);

    // Convert users to options format - try loading actual photos first
    const userOptions = users.map(u => ({
        value: u.id.toString(),
        label: `${u.name} - ${u.fname}`,
        // imageKey already existed for exactly this; Date.now() here changed the
        // URL on every render and re-downloaded every avatar.
        image: `${getPhotoUrl(u.id, 'small')}?v=${imageKey}`
    }));

    const currentImageUrl = selectedUser
        ? `${getPhotoUrl(selectedUser.id, 'large')}?v=${imageKey}`
        : '';

    const handleDelete = async () => {
        if (!selectedUser) return;

        if (!confirm('Are you sure you want to delete this photo?')) return;

        setErrorMessage('');

        try {
            const response = await fetch('/api/admin/delete-photo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: selectedUser.id })
            });

            const data = await response.json();

            if (data.success) {
                setImageKey(prev => prev + 1);
                setSuccessMessage('Photo deleted successfully!');
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                setErrorMessage(data.error || 'Failed to delete photo.');
            }
        } catch (error) {
            console.error('Delete error:', error);
            setErrorMessage('Could not reach the server. Please try again.');
        }
    };

    return (
        <>
            <Card className="w-full max-w-lg mx-auto border-t-4 border-t-primary">
                <CardHeader>
                    <CardTitle>Photo Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {successMessage && (
                        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
                            {successMessage}
                        </div>
                    )}

                    {errorMessage && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                            {errorMessage}
                        </div>
                    )}

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
                                        key={imageKey}
                                        src={currentImageUrl}
                                        alt={selectedUser.name}
                                        className="w-40 h-40 rounded-full object-cover border-4 border-gray-200"
                                        loading="eager"
                                        onError={(e) => {
                                            applyAvatarFallback(e.currentTarget, selectedUser.name, 300);
                                        }}
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
                                {selectedUser.hasImage && (
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
                    setPhotoModalOpen(false);
                    setImageKey(prev => prev + 1);
                    setSuccessMessage('Operation completed successfully!');
                    setTimeout(() => setSuccessMessage(''), 3000);
                }}
            />
        </>
    );
}
