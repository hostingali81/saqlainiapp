export default function Loading() {
    return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#FFF8E7' }}>
            <div className="text-center">
                <div 
                    className="animate-spin rounded-full h-16 w-16 border-4 mx-auto mb-4"
                    style={{ 
                        borderColor: '#C6A869',
                        borderTopColor: 'transparent'
                    }}
                />
                <p style={{ color: '#0D483B' }} className="font-medium">Loading...</p>
            </div>
        </div>
    );
}
