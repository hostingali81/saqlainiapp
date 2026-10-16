'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Modal, Notice, useConfirm } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { User } from '@/types';
import { Upload, Trash2, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '@/lib/cropImage';
import { applyAvatarFallback, getPhotoUrl } from '@/lib/utils';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

interface PhotoUploadModalProps {
    user: User | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function PhotoUploadModal({ user, isOpen, onClose, onSuccess }: PhotoUploadModalProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>('');
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [uploading, setUploading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [confirm, confirmDialog] = useConfirm();

    useEffect(() => {
        return () => {
            if (previewUrl && previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];

            if (!ALLOWED_TYPES.includes(file.type)) {
                setErrorMessage('Please choose a JPEG, PNG or WebP image.');
                e.target.value = '';
                return;
            }
            if (file.size > MAX_IMAGE_BYTES) {
                setErrorMessage('That image is larger than 5MB. Please choose a smaller one.');
                e.target.value = '';
                return;
            }

            setErrorMessage('');
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setZoom(1);
            setCrop({ x: 0, y: 0 });
        }
    };

    const cropAndUpload = async () => {
        if (!selectedFile || !croppedAreaPixels || !user) return;

        setUploading(true);
        setErrorMessage('');

        try {
            const largeBlob = await getCroppedImg(previewUrl, croppedAreaPixels, 300, 300);
            const smallBlob = await getCroppedImg(previewUrl, croppedAreaPixels, 70, 70);

            if (!largeBlob || !smallBlob) {
                throw new Error('Failed to crop image');
            }

            const formData = new FormData();
            formData.append('largeImage', largeBlob, `${user.id}.jpg`);
            formData.append('smallImage', smallBlob, `${user.id}.jpg`);
            formData.append('userId', user.id.toString());

            const response = await fetch('/api/admin/upload-photo', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                onSuccess();
                handleClose();
            } else {
                setErrorMessage(data.error || 'Failed to upload photo.');
                setUploading(false);
            }
        } catch (error) {
            console.error('Upload error:', error);
            setErrorMessage('Could not reach the server. Please try again.');
            setUploading(false);
        }
    };

    const deletePhoto = async () => {
        if (!user) return;

        const ok = await confirm({
            title: 'Photo delete karein?',
            message: <>{user.name} ki photo hata di jayegi.</>,
            danger: true,
        });
        if (!ok) return;

        setUploading(true);
        setErrorMessage('');

        try {
            const response = await fetch('/api/admin/delete-photo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            });

            const data = await response.json();

            if (data.success) {
                onSuccess();
                handleClose();
            } else {
                setErrorMessage(data.error || 'Failed to delete photo.');
            }
        } catch (error) {
            console.error('Delete error:', error);
            setErrorMessage('Could not reach the server. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const handleClose = () => {
        setSelectedFile(null);
        setPreviewUrl('');
        setUploading(false);
        setErrorMessage('');
        onClose();
    };

    // One cache-busting value per time the dialog is opened for a user. Calling
    // Date.now() during render changed the URL on every keystroke/re-render.
    const currentImageUrl = useMemo(
        () => (user ? `${getPhotoUrl(user.id, 'large')}?v=${Date.now()}` : ''),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [user?.id, isOpen]
    );

    if (!user) return null;

    return (
        <>
            <Modal
                open={isOpen}
                onClose={handleClose}
                busy={uploading}
                size="lg"
                title={selectedFile ? 'Photo crop karein' : 'Member photo'}
                description={selectedFile ? 'Photo ko khinch kar sahi jagah layein, zoom se size set karein.' : `${user.name} · ${user.fname}`}
                footer={selectedFile ? (
                    <>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setSelectedFile(null);
                                setPreviewUrl('');
                            }}
                            disabled={uploading}
                            className="h-11"
                        >
                            Cancel
                        </Button>
                        <Button onClick={cropAndUpload} disabled={uploading} className="h-11">
                            {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</> : 'Save photo'}
                        </Button>
                    </>
                ) : undefined}
            >
                <div className="space-y-4">
                    {errorMessage && <Notice tone="error">{errorMessage}</Notice>}
                    {!selectedFile ? (
                        <div className="space-y-5">
                            <div className="flex justify-center">
                                <img
                                    src={currentImageUrl}
                                    alt={user.name}
                                    className="h-48 w-48 rounded-full border-4 border-primary/20 object-cover shadow-lg sm:h-56 sm:w-56"
                                    onError={(e) => {
                                        applyAvatarFallback(e.currentTarget, user.name, 300);
                                    }}
                                />
                            </div>

                            <div className="space-y-2.5">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    id="photo-upload-input"
                                />
                                <Button asChild className="h-12 w-full rounded-lg text-base" size="lg">
                                    <label htmlFor="photo-upload-input" className="cursor-pointer">
                                        <Upload className="h-5 w-5" />
                                        Nayi photo chuniye
                                    </label>
                                </Button>

                                <Button
                                    onClick={deletePhoto}
                                    disabled={uploading}
                                    variant="destructive"
                                    className="h-12 w-full rounded-lg text-base"
                                    size="lg"
                                >
                                    {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                                    Photo hataein
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="relative h-[50vh] w-full overflow-hidden rounded-xl bg-gray-900 sm:h-[55vh]">
                                <Cropper
                                    image={previewUrl}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={1}
                                    onCropChange={setCrop}
                                    onCropComplete={onCropComplete}
                                    onZoomChange={setZoom}
                                    cropShape="round"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="flex items-center justify-between text-sm font-medium">
                                    <span>Zoom</span>
                                    <span className="text-muted-foreground">{zoom.toFixed(1)}x</span>
                                </label>
                                <div className="flex items-center gap-3">
                                    <ZoomOut className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                                    <input
                                        type="range"
                                        value={zoom}
                                        min={1}
                                        max={3}
                                        step={0.1}
                                        onChange={(e) => setZoom(Number(e.target.value))}
                                        className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-200 accent-primary"
                                    />
                                    <ZoomIn className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
            {confirmDialog}
        </>
    );
}
