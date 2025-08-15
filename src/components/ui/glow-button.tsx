import React from 'react'

function GlowButton({
    children, onClick
}: {
    children: React.ReactNode
    onClick?: () => void
}): React.JSX.Element {
    return (
        <button 
            onClick={onClick}
            className="hover:opacity-[0.90]  shadow-[3px_3px_12px_-1px_#ffffff20] rounded-full   relative overflow-hidden after:absolute after:content-[''] after:inset-0 after:[box-shadow:0_0_15px_-1px_#ffffff20_inset]  before:absolute before:content-[''] before:inset-0   flex items-center before:z-20 after:z-10     bg-transparent  border-[#3e4340] "
        >
            <div className="flex items-center gap-2 drop-shadow-lg  px-4 py-3 z-0 ">

                <p>{children}</p>
            </div>

        </button>
    )
}

export default GlowButton