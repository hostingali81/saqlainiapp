'use client';

import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { User } from '@/types';
import { Camera, Upload, Trash2, ZoomIn, ZoomOut } from 'lucide-react';
import Image from 'next/image';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '@/lib/cropImage';
import { getPhotoUrl } from '@/lib/utils';

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

    // Cleanup object URLs to avoid memory leaks
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
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setZoom(1);
            setCrop({ x: 0, y: 0 });
        }
    };

    const cropAndUpload = async () => {
        if (!selectedFile || !croppedAreaPixels || !user) return;

        setUploading(true);

        try {
            // Generate Large Image (300x300)
            const largeBlob = await getCroppedImg(
                previewUrl,
                croppedAreaPixels,
                300,
                300
            );

            // Generate Small Image (70x70)
            const smallBlob = await getCroppedImg(
                previewUrl,
                croppedAreaPixels,
                70,
                70
            );

            if (!largeBlob || !smallBlob) {
                throw new Error('Failed to crop image');
            }

            // Upload
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
                // Determine origin to perform a hard reload
                window.location.href = window.location.href;
                // Alternatively, if we just want to reload:
                window.location.reload();
            } else {
                alert('Failed to upload photo');
                setUploading(false);
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Error uploading photo');
            setUploading(false);
        }
    };

    const deletePhoto = async () => {
        if (!user) return;

        if (!confirm('Are you sure you want to delete this photo?')) return;

        setUploading(true);

        try {
            const response = await fetch('/api/admin/delete-photo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
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
        } finally {
            setUploading(false);
        }
    };

    const handleClose = () => {
        setSelectedFile(null);
        setPreviewUrl('');
        setUploading(false);
        onClose();
    };

    if (!user) return null;

    const hasImage = user.hasImage;
    const currentImageUrl = hasImage
        ? `${getPhotoUrl(user.id, 'large')}?v=${Date.now()}`
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&bold=true&color=666&size=300`;

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Camera className="h-5 w-5" />
                        Change Photo
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {!selectedFile ? (
                        <>
                            {/* User Info */}
                            <div className="text-center">
                                <h3 className="font-semibold">{user.name}</h3>
                                <p className="text-sm text-muted-foreground">{user.fname}</p>
                            </div>

                            {/* Current Photo */}
                            <div className="flex justify-center">
                                <Image
                                    src={currentImageUrl}
                                    alt={user.name}
                                    width={150}
                                    height={150}
                                    className="w-32 h-32 rounded-full object-cover border-2 border-gray-200"
                                    unoptimized
                                />
                            </div>

                            {/* File Input */}
                            <div>
                                <label className="block">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                        id="photo-upload"
                                    />
                                    <Button asChild variant="outline" className="w-full">
                                        <label htmlFor="photo-upload" className="cursor-pointer">
                                            <Upload className="h-4 w-4 mr-2" />
                                            Select Photo
                                        </label>
                                    </Button>
                                </label>
                            </div>

                            {hasImage && (
                                <Button
                                    onClick={deletePhoto}
                                    disabled={uploading}
                                    variant="destructive"
                                    className="w-full"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Current Photo
                                </Button>
                            )}
                        </>
                    ) : (
                        <>
                            {/* Cropper UI */}
                            <div className="relative w-full h-64 bg-gray-900 rounded-lg overflow-hidden touch-none">
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

                            {/* Zoom Slider */}
                            <div className="flex items-center gap-2">
                                <ZoomOut className="h-4 w-4 text-muted-foreground" />
                                <input
                                    type="range"
                                    value={zoom}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    aria-labelledby="Zoom"
                                    onChange={(e) => setZoom(Number(e.target.value))}
                                    className="flex-1"
                                />
                                <ZoomIn className="h-4 w-4 text-muted-foreground" />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setSelectedFile(null);
                                        setPreviewUrl('');
                                    }}
                                    disabled={uploading}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={cropAndUpload}
                                    disabled={uploading}
                                    className="flex-1"
                                >
                                    {uploading ? 'Uploading...' : 'Save & Upload'}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
