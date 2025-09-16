'use client';
import { useEffect, useRef } from 'react';

export const useBodyScrollLock = (isLocked: boolean) => {
  const scrollPosition = useRef<number>(0);
  const originalStyles = useRef<{
    body: { [key: string]: string };
    html: { [key: string]: string };
  }>({ body: {}, html: {} });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const body = document.body;
    const html = document.documentElement;

    if (isLocked) {
      // Store current scroll position
      scrollPosition.current = window.pageYOffset;
      
      // Store original styles
      originalStyles.current.body = {
        position: body.style.position,
        top: body.style.top,
        left: body.style.left,
        right: body.style.right,
        overflow: body.style.overflow,
        width: body.style.width,
      };
      originalStyles.current.html = {
        overflow: html.style.overflow,
      };
      
      // Apply styles to prevent scrolling
      body.style.position = 'fixed';
      body.style.top = `-${scrollPosition.current}px`;
      body.style.left = '0';
      body.style.right = '0';
      body.style.width = '100%';
      body.style.overflow = 'hidden';
      
      // Also prevent scrolling on html element
      html.style.overflow = 'hidden';
      
      // Prevent touch scrolling on mobile
      const preventTouchMove = (e: TouchEvent) => {
        e.preventDefault();
      };
      
      document.addEventListener('touchmove', preventTouchMove, { passive: false });
      
      // Store the event listener for cleanup
      (body as any)._preventTouchMove = preventTouchMove;
    } else {
      // Restore original styles
      const bodyStyles = originalStyles.current.body;
      const htmlStyles = originalStyles.current.html;
      
      body.style.position = bodyStyles.position || '';
      body.style.top = bodyStyles.top || '';
      body.style.left = bodyStyles.left || '';
      body.style.right = bodyStyles.right || '';
      body.style.width = bodyStyles.width || '';
      body.style.overflow = bodyStyles.overflow || '';
      html.style.overflow = htmlStyles.overflow || '';
      
      // Remove touch move prevention
      if ((body as any)._preventTouchMove) {
        document.removeEventListener('touchmove', (body as any)._preventTouchMove);
        delete (body as any)._preventTouchMove;
      }
      
      // Restore scroll position
      window.scrollTo(0, scrollPosition.current);
    }

    // Cleanup function
    return () => {
      if (isLocked) {
        const bodyStyles = originalStyles.current.body;
        const htmlStyles = originalStyles.current.html;
        
        body.style.position = bodyStyles.position || '';
        body.style.top = bodyStyles.top || '';
        body.style.left = bodyStyles.left || '';
        body.style.right = bodyStyles.right || '';
        body.style.width = bodyStyles.width || '';
        body.style.overflow = bodyStyles.overflow || '';
        html.style.overflow = htmlStyles.overflow || '';
        
        // Remove touch move prevention
        if ((body as any)._preventTouchMove) {
          document.removeEventListener('touchmove', (body as any)._preventTouchMove);
          delete (body as any)._preventTouchMove;
        }
        
        window.scrollTo(0, scrollPosition.current);
      }
    };
  }, [isLocked]);
};