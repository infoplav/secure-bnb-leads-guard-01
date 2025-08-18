
import React from 'react';
import { Bot, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface BotDetectionProps {
  userAgent: string | null;
  language: string;
}

export const BotDetection: React.FC<BotDetectionProps> = ({ userAgent, language }) => {
  const t = {
    en: {
      bot: 'Bot',
      human: 'Human',
      unknown: 'Unknown'
    },
    fr: {
      bot: 'Bot',
      human: 'Humain',
      unknown: 'Inconnu'
    }
  };

  const currentLang = t[language as keyof typeof t];

  const detectBot = (userAgent: string | null): { isBot: boolean; confidence: number } => {
    if (!userAgent) return { isBot: false, confidence: 0 };

    const botPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /java/i,
      /apache/i,
      /http/i,
      /postman/i,
      /insomnia/i,
      /axios/i,
      /fetch/i,
      /node/i,
      /php/i,
      /ruby/i,
      /go-http/i,
      /okhttp/i,
      /dart/i,
      /swift/i
    ];

    const suspiciousPatterns = [
      /headless/i,
      /phantom/i,
      /selenium/i,
      /webdriver/i,
      /puppeteer/i,
      /playwright/i
    ];

    let botScore = 0;
    let maxScore = 0;

    // Check for bot patterns
    botPatterns.forEach(pattern => {
      maxScore += 10;
      if (pattern.test(userAgent)) {
        botScore += 10;
      }
    });

    // Check for suspicious patterns
    suspiciousPatterns.forEach(pattern => {
      maxScore += 15;
      if (pattern.test(userAgent)) {
        botScore += 15;
      }
    });

    // Check for missing common browser patterns
    const browserPatterns = [
      /mozilla/i,
      /webkit/i,
      /chrome/i,
      /firefox/i,
      /safari/i,
      /edge/i,
      /opera/i
    ];

    const hasBrowserPattern = browserPatterns.some(pattern => pattern.test(userAgent));
    maxScore += 5;
    if (!hasBrowserPattern) {
      botScore += 5;
    }

    // Check for overly simple user agents
    if (userAgent.length < 20) {
      maxScore += 5;
      botScore += 5;
    }

    const confidence = maxScore > 0 ? (botScore / maxScore) * 100 : 0;
    const isBot = confidence > 50;

    return { isBot, confidence };
  };

  const { isBot, confidence } = detectBot(userAgent);

  if (!userAgent) {
    return (
      <Badge variant="outline" className="bg-gray-100">
        <User className="h-3 w-3 mr-1" />
        {currentLang.unknown}
      </Badge>
    );
  }

  if (isBot) {
    return (
      <Badge variant="destructive" className="bg-red-100 text-red-800">
        <Bot className="h-3 w-3 mr-1" />
        {currentLang.bot} ({Math.round(confidence)}%)
      </Badge>
    );
  }

  return (
    <Badge variant="default" className="bg-green-100 text-green-800">
      <User className="h-3 w-3 mr-1" />
      {currentLang.human}
    </Badge>
  );
};
