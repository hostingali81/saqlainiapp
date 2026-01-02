'use client';

import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { User } from '@/types';
import { Camera, Upload, Trash2, ZoomIn, ZoomOut, X } from 'lucide-react';
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
                onSuccess();
                handleClose();
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

    const currentImageUrl = `${getPhotoUrl(user.id, 'large')}?v=${Date.now()}`;

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="w-full sm:max-w-2xl max-h-[95vh] p-0 gap-0 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-4 py-3 border-b flex items-center justify-between bg-gradient-to-r from-primary/5 to-primary/10">
                    <div className="flex items-center gap-2">
                        <Camera className="h-5 w-5 text-primary" />
                        <h2 className="font-semibold text-lg">Photo Management</h2>
                    </div>
                    <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded-full">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                    {!selectedFile ? (
                        <div className="space-y-6">
                            {/* User Info */}
                            <div className="text-center">
                                <h3 className="font-bold text-xl text-primary">{user.name}</h3>
                                <p className="text-sm text-muted-foreground mt-1">{user.fname}</p>
                            </div>

                            {/* Current Photo */}
                            <div className="flex justify-center">
                                <div className="relative">
                                    <img
                                        src={currentImageUrl}
                                        alt={user.name}
                                        className="w-56 h-56 sm:w-64 sm:h-64 rounded-full object-cover border-4 border-primary/20 shadow-lg"
                                        onError={(e) => {
                                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&bold=true&color=0D483B&size=300`;
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-3">
                                <label className="block">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                        id="photo-upload-input"
                                    />
                                    <Button asChild className="w-full h-12 text-base" size="lg">
                                        <label htmlFor="photo-upload-input" className="cursor-pointer">
                                            <Upload className="h-5 w-5 mr-2" />
                                            Select New Photo
                                        </label>
                                    </Button>
                                </label>

                                <Button
                                    onClick={deletePhoto}
                                    disabled={uploading}
                                    variant="destructive"
                                    className="w-full h-12 text-base"
                                    size="lg"
                                >
                                    <Trash2 className="h-5 w-5 mr-2" />
                                    Delete Photo
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Cropper */}
                            <div className="relative w-full h-[50vh] sm:h-[60vh] bg-gray-900 rounded-lg overflow-hidden">
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

                            {/* Zoom Control */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center justify-between">
                                    <span>Zoom Level</span>
                                    <span className="text-muted-foreground">{zoom.toFixed(1)}x</span>
                                </label>
                                <div className="flex items-center gap-3">
                                    <ZoomOut className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                    <input
                                        type="range"
                                        value={zoom}
                                        min={1}
                                        max={3}
                                        step={0.1}
                                        onChange={(e) => setZoom(Number(e.target.value))}
                                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                    <ZoomIn className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {selectedFile && (
                    <div className="px-4 py-3 border-t bg-gray-50 flex gap-3">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setSelectedFile(null);
                                setPreviewUrl('');
                            }}
                            disabled={uploading}
                            className="flex-1 h-11"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={cropAndUpload}
                            disabled={uploading}
                            className="flex-1 h-11"
                        >
                            {uploading ? 'Uploading...' : 'Save Photo'}
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
