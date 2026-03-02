import { BORDER_PATHS, FILL_PATHS } from './LogoSvgPaths';

type Props = {
    width: number
    height?: number
    fillColor?: string
    borderColor?: string
    chargingLevel?: number // 0-100, represents percentage of servers running
}

const LogoSvg = ({width, height, fillColor = "#FF3E3E", borderColor = "#6B1515", chargingLevel = 0}: Props) => {
    // Calculate glow intensity based on charging level
    const glowIntensity = chargingLevel / 100;
    const glowOpacity = Math.max(0.1, glowIntensity * 0.8); // Minimum 10% opacity, max 80%
    const glowRadius = 2 + (glowIntensity * 8); // Radius from 2 to 10

    // Create dynamic glow colors based on charging level
    const getGlowColor = () => {
        if (chargingLevel === 0) return fillColor;
        if (chargingLevel <= 25) return "#FF6B6B"; // Light red
        if (chargingLevel <= 50) return "#FFB366"; // Orange
        if (chargingLevel <= 75) return "#FFE066"; // Yellow
        return "#66FF66"; // Green for full charge
    };

    const glowColor = getGlowColor();

    return <svg width={width} height={height} viewBox="0 0 626 316" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
        {/* Charging glow filter */}
        <filter id="chargingGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={glowRadius} result="coloredBlur"/>
            <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
        </filter>

        {/* Animated charging flow */}
        <linearGradient id="chargingFlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={glowColor} stopOpacity={glowOpacity * 0.3}>
                <animate attributeName="stop-opacity"
                         values={`${glowOpacity * 0.1};${glowOpacity * 0.6};${glowOpacity * 0.1}`}
                         dur="2s"
                         repeatCount="indefinite"/>
            </stop>
            <stop offset="50%" stopColor={glowColor} stopOpacity={glowOpacity * 0.6}>
                <animate attributeName="stop-opacity"
                         values={`${glowOpacity * 0.3};${glowOpacity * 0.9};${glowOpacity * 0.3}`}
                         dur="2s"
                         repeatCount="indefinite"/>
            </stop>
            <stop offset="100%" stopColor={glowColor} stopOpacity={glowOpacity * 0.3}>
                <animate attributeName="stop-opacity"
                         values={`${glowOpacity * 0.1};${glowOpacity * 0.6};${glowOpacity * 0.1}`}
                         dur="2s"
                         repeatCount="indefinite"/>
            </stop>
        </linearGradient>

        {/* Pulsing outer glow */}
        <filter id="outerGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation={glowRadius * 2} result="glow"/>
            <feColorMatrix in="glow" type="matrix"
                          values={`1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${glowOpacity * 0.5} 0`}/>
        </filter>

        {/* Energy particles */}
        <circle id="particle" r="2" fill={glowColor} opacity={glowOpacity * 0.8}>
            <animateTransform
                attributeName="transform"
                type="translate"
                values="300,150; 320,140; 340,160; 360,150; 380,140; 400,150"
                dur="4s"
                repeatCount="indefinite"
            />
            <animate attributeName="opacity"
                     values={`0;${glowOpacity * 0.8};0`}
                     dur="4s"
                     repeatCount="indefinite"/>
        </circle>
    </defs>

    {/* Outer glow layer */}
    {chargingLevel > 0 && (
        <g filter="url(#outerGlow)" opacity={glowOpacity}>
            <circle cx="313" cy="158" r="120" fill={glowColor}>
                <animate attributeName="r"
                         values="120;140;120"
                         dur="3s"
                         repeatCount="indefinite"/>
                <animate attributeName="opacity"
                         values={`${glowOpacity * 0.3};${glowOpacity * 0.7};${glowOpacity * 0.3}`}
                         dur="3s"
                         repeatCount="indefinite"/>
            </circle>
        </g>
    )}

    {/* Energy particles flowing around the logo */}
    {chargingLevel > 0 && (
        <g opacity={glowOpacity}>
            {/* Particle 1 */}
            <circle r="3" fill={glowColor}>
                <animateMotion dur="6s" repeatCount="indefinite"
                              path="M 200,100 Q 350,50 500,100 Q 450,200 350,250 Q 250,200 200,100 Z"/>
                <animate attributeName="opacity"
                         values={`0;${glowOpacity};0;${glowOpacity};0`}
                         dur="6s"
                         repeatCount="indefinite"/>
            </circle>

            {/* Particle 2 */}
            <circle r="2" fill={glowColor}>
                <animateMotion dur="8s" repeatCount="indefinite"
                              path="M 150,150 Q 300,80 450,150 Q 400,220 300,280 Q 200,220 150,150 Z"/>
                <animate attributeName="opacity"
                         values={`${glowOpacity * 0.7};0;${glowOpacity * 0.7};0;${glowOpacity * 0.7}`}
                         dur="8s"
                         repeatCount="indefinite"/>
            </circle>

            {/* Particle 3 */}
            <circle r="2.5" fill={glowColor}>
                <animateMotion dur="7s" repeatCount="indefinite"
                              path="M 250,80 Q 400,120 480,180 Q 420,240 320,260 Q 220,240 250,80 Z"/>
                <animate attributeName="opacity"
                         values={`0;${glowOpacity * 0.8};${glowOpacity * 0.4};${glowOpacity * 0.8};0`}
                         dur="7s"
                         repeatCount="indefinite"/>
            </circle>

            {/* Inner energy ring */}
            <circle cx="313" cy="158" r="80" fill="none" stroke={glowColor} strokeWidth="2" opacity={glowOpacity * 0.4}>
                <animate attributeName="r"
                         values="80;90;80"
                         dur="2s"
                         repeatCount="indefinite"/>
                <animate attributeName="stroke-opacity"
                         values={`${glowOpacity * 0.2};${glowOpacity * 0.6};${glowOpacity * 0.2}`}
                         dur="2s"
                         repeatCount="indefinite"/>
            </circle>
        </g>
    )}

    <g filter="url(#filter0_i_514_3002)">
    {/* Charging flow overlay — reuses the first border path with gradient fill */}
    {chargingLevel > 0 && (
        <g filter="url(#chargingGlow)" opacity={glowOpacity}>
            <path d={BORDER_PATHS[0]} fill="url(#chargingFlow)"/>
        </g>
    )}

    {/* Border (outline) paths */}
    {BORDER_PATHS.map((d, i) => (
        <path key={`b${i}`} d={d} fill={borderColor}/>
    ))}

    {/* Fill (interior) paths */}
    {FILL_PATHS.map((d, i) => (
        <path key={`f${i}`} d={d} fill={fillColor}/>
    ))}
    </g>
    </svg>
}

export default LogoSvg;
