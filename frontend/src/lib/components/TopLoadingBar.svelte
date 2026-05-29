<div class="pointer-events-none fixed left-0 right-0 top-0 z-[80] h-1 overflow-hidden bg-emerald-100">
	<div class="youtube-loading h-full bg-brand"></div>
</div>

<style>
	.youtube-loading {
		width: 35%;
		transform-origin: left;
		animation: youtube-progress 1.25s ease-in-out infinite;
	}

	@keyframes youtube-progress {
		0% {
			transform: translateX(-110%) scaleX(0.4);
		}
		45% {
			transform: translateX(55vw) scaleX(1.25);
		}
		100% {
			transform: translateX(115vw) scaleX(0.65);
		}
	}
</style>
