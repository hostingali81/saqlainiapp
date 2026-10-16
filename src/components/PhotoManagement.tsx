'use client';

import { useState } from 'react';
import { User } from '@/types';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { Field, Notice, Panel, useConfirm } from '@/components/admin/ui';
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
    const [deleting, setDeleting] = useState(false);
    const [confirm, confirmDialog] = useConfirm();

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

        const ok = await confirm({
            title: 'Photo delete karein?',
            message: <>{selectedUser.name} ki photo hata di jayegi.</>,
            danger: true,
        });
        if (!ok) return;

        setErrorMessage('');
        setDeleting(true);

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
        } finally {
            setDeleting(false);
        }
    };

    return (
        <>
            <Panel title="Member photo" description="Member chuniye, phir photo badlein ya hataein." icon={Camera} bodyClassName="space-y-4">
                {successMessage && <Notice tone="success">{successMessage}</Notice>}
                {errorMessage && <Notice tone="error" onClose={() => setErrorMessage('')}>{errorMessage}</Notice>}

                <Field label="Member">
                    <SearchableSelect
                        options={userOptions}
                        value={selectedUserId}
                        onChange={setSelectedUserId}
                        placeholder="Search and select user..."
                    />
                </Field>

                {selectedUser && (
                    <div className="space-y-4 pt-1">
                        <div className="flex flex-col items-center text-center">
                            <img
                                key={imageKey}
                                src={currentImageUrl}
                                alt={selectedUser.name}
                                className="h-40 w-40 rounded-full border-4 border-border object-cover shadow-sm"
                                loading="eager"
                                onError={(e) => {
                                    applyAvatarFallback(e.currentTarget, selectedUser.name, 300);
                                }}
                            />
                            <p className="mt-3 text-base font-semibold">{selectedUser.name}</p>
                            <p className="text-xs text-muted-foreground">{selectedUser.fname}</p>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Button onClick={() => setPhotoModalOpen(true)} size="lg" className="flex-1 rounded-lg">
                                <Camera className="h-4 w-4" />
                                Photo badlein
                            </Button>
                            {selectedUser.hasImage && (
                                <Button onClick={handleDelete} disabled={deleting} variant="destructive" size="lg" className="flex-1 rounded-lg">
                                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    Photo hataein
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </Panel>

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
        {confirmDialog}
        </>
    );
}
