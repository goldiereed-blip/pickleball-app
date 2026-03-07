'use client';

import dynamic from 'next/dynamic';
import type { CallBackProps, Step } from 'react-joyride';

const Joyride = dynamic(() => import('react-joyride'), { ssr: false });

interface TutorialTourProps {
  run: boolean;
  onFinish: () => void;
}

const steps: Step[] = [
  {
    target: 'body',
    placement: 'center',
    disableBeacon: true,
    title: 'Welcome to Pickleball Round Robin!',
    content: "Let's show you the key features in 30 seconds.",
  },
  {
    target: '#tutorial-groups',
    placement: 'bottom',
    disableBeacon: true,
    title: 'My Groups',
    content: 'Create groups for your regular players. Schedule recurring games without re-entering names each time.',
  },
  {
    target: '#tutorial-create-game',
    placement: 'bottom',
    disableBeacon: true,
    title: 'Create a Game',
    content: 'Create one-time games for pickup play or special events. Set courts, players, and mode.',
  },
  {
    target: '#tutorial-join-game',
    placement: 'bottom',
    disableBeacon: true,
    title: 'Join a Game',
    content: 'Got an invite? Enter a game or group code here to join instantly.',
  },
  {
    target: '#tutorial-profile',
    placement: 'bottom-end',
    disableBeacon: true,
    title: 'Your Profile',
    content: 'View your game history and manage your account here.',
  },
  {
    target: 'body',
    placement: 'center',
    disableBeacon: true,
    title: "You're all set!",
    content: 'Create your first group or join an existing game to get started.',
  },
];

export default function TutorialTour({ run, onFinish }: TutorialTourProps) {
  const handleCallback = (data: CallBackProps) => {
    const { status } = data;
    if (status === 'finished' || status === 'skipped') {
      onFinish();
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showSkipButton
      showProgress
      disableOverlayClose
      scrollToFirstStep
      callback={handleCallback}
      locale={{ last: 'Get Started' }}
      styles={{
        options: {
          primaryColor: '#5e3485',
          zIndex: 10000,
        },
        buttonNext: {
          backgroundColor: '#5e3485',
          borderRadius: '12px',
          padding: '10px 20px',
          fontSize: '14px',
          fontWeight: 600,
          minHeight: '48px',
        },
        buttonBack: {
          color: '#5e3485',
          fontSize: '14px',
          minHeight: '48px',
        },
        buttonSkip: {
          color: '#9ca3af',
          fontSize: '13px',
          minHeight: '44px',
        },
        tooltip: {
          borderRadius: '16px',
          padding: '20px',
          maxWidth: '320px',
        },
        tooltipTitle: {
          fontSize: '18px',
          fontWeight: 700,
          color: '#111827',
          marginBottom: '4px',
        },
        tooltipContent: {
          fontSize: '14px',
          color: '#4b5563',
          lineHeight: 1.6,
          paddingTop: '8px',
        },
        spotlight: {
          borderRadius: '12px',
        },
      }}
    />
  );
}
