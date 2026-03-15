export function OmniBackground() {
    return (
        <div className="pointer-events-none absolute bottom-0 right-0 opacity-10">

            <svg width="420" height="420" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="90" stroke="#ffea00" strokeWidth="2" fill="none" />
                <circle cx="100" cy="100" r="60" stroke="#ffea00" strokeWidth="2" fill="none" />
                <circle cx="100" cy="100" r="30" stroke="#ffea00" strokeWidth="2" fill="none" />
            </svg>

        </div>
    )
}