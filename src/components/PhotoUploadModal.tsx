'use client';

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { User } from '@/types';
import { Camera, Upload, Trash2 } from 'lucide-react';
import Image from 'next/image';

interface PhotoUploadModalProps {
    user: User | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function PhotoUploadModal({ user, isOpen, onClose, onSuccess }: PhotoUploadModalProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>('');
    const [cropping, setCropping] = useState(false);
    const [uploading, setUploading] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        if (!selectedFile) {
            setPreviewUrl('');
            return;
        }

        const objectUrl = URL.createObjectURL(selectedFile);
        setPreviewUrl(objectUrl);

        return () => URL.revokeObjectURL(objectUrl);
    }, [selectedFile]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            setSelectedFile(file);
            setCropping(true);
        }
    };

    const cropAndUpload = async () => {
        if (!selectedFile || !imageRef.current || !canvasRef.current || !user) return;

        setUploading(true);

        try {
            const img = imageRef.current;

            // Create 300x300 canvas for large image
            const largeCanvas = document.createElement('canvas');
            largeCanvas.width = 300;
            largeCanvas.height = 300;
            const largeCtx = largeCanvas.getContext('2d');

            // Create 70x70 canvas for small image
            const smallCanvas = document.createElement('canvas');
            smallCanvas.width = 70;
            smallCanvas.height = 70;
            const smallCtx = smallCanvas.getContext('2d');

            if (!largeCtx || !smallCtx) {
                throw new Error('Could not get canvas context');
            }

            // Calculate crop dimensions (square from center)
            const size = Math.min(img.naturalWidth, img.naturalHeight);
            const x = (img.naturalWidth - size) / 2;
            const y = (img.naturalHeight - size) / 2;

            // Draw cropped and resized images
            largeCtx.drawImage(img, x, y, size, size, 0, 0, 300, 300);
            smallCtx.drawImage(img, x, y, size, size, 0, 0, 70, 70);

            // Convert to blobs
            const largeBlob = await new Promise<Blob>((resolve) => {
                largeCanvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.9);
            });

            const smallBlob = await new Promise<Blob>((resolve) => {
                smallCanvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.9);
            });

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
                alert('Photo uploaded successfully!');
                onSuccess();
                onClose();
            } else {
                alert('Failed to upload photo');
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Error uploading photo');
        } finally {
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
                onSuccess();
                onClose();
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

    if (!user) return null;

    const hasImage = user.hasImage;
    const currentImageUrl = hasImage
        ? `/upload/large_image/${user.id}.jpg?v=${Date.now()}`
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&bold=true&color=666&size=300`;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Camera className="h-5 w-5" />
                        Change Photo
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
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
                            width={128}
                            height={128}
                            className="w-32 h-32 rounded-full object-cover border-2 border-gray-200"
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

                    {/* Preview */}
                    {previewUrl && (
                        <div className="border rounded p-2">
                            <p className="text-sm font-medium mb-2">Preview:</p>
                            <img
                                ref={imageRef}
                                src={previewUrl}
                                alt="Preview"
                                className="w-full rounded"
                            />
                            <canvas ref={canvasRef} className="hidden" />
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                        {selectedFile && (
                            <Button
                                onClick={cropAndUpload}
                                disabled={uploading}
                                className="flex-1"
                            >
                                {uploading ? 'Uploading...' : 'Crop & Upload'}
                            </Button>
                        )}

                        {hasImage && (
                            <Button
                                onClick={deletePhoto}
                                disabled={uploading}
                                variant="destructive"
                                className="flex-1"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
