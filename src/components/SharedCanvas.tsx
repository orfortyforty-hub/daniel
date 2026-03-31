'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Type, Download, Trash2, Paintbrush, ChevronUp, Eraser, Hand, Undo2, Redo2 } from 'lucide-react';
import styles from './SharedCanvas.module.css';

type Point = { x: number; y: number };

type CanvasElement = {
    id: string;
    type: 'path' | 'text';
    points?: Point[];
    x?: number;
    y?: number;
    width?: number;
    value?: string;
    color: string;
    brushSize: number;
    brushType?: string;
    fontFamily?: string;
    textStyle?: string;
    ownerId: string;
};

type HistoryEntry =
    | { type: 'create'; element: CanvasElement }
    | { type: 'delete'; element: CanvasElement }
    | { type: 'update'; before: CanvasElement; after: CanvasElement };

/** CSS pixels; actual backing size is capped per GPU/browser (~16k per axis). */
const CANVAS_HEIGHT = 40_000;

const MAX_BACKING_DIMENSION = 16_384;
const COLORS = [
    '#000000', '#ffffff', '#FF0000', '#00FF00', '#0000FF', 
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#8B4513',
    '#5bc8f5', '#f0e6d2', '#ff69b4', '#9370db', '#32cd32',
    '#ff4500', '#ffd700', '#7cfc00', '#00ced1', '#1e90ff',
    '#8a2be2', '#c71585', '#d2691e', '#556b2f', '#4682b4',
    '#000080', '#800000', '#008000', '#808000', '#800080'
];

const BRUSH_TYPES = [
    { id: 'solid', name: 'Solid', icon: '✏️' },
    { id: 'glow', name: 'Glow', icon: '✨' },
    { id: 'spray', name: 'Spray', icon: '💨' },
    { id: 'calligraphy', name: 'Calligraphy', icon: '✒️' },
    { id: 'marker', name: 'Marker', icon: '🖍️' }
];

const FONTS = [
    { id: 'Assistant', name: 'Assistant' },
    { id: 'Heebo', name: 'Heebo' },
    { id: 'Rubik', name: 'Rubik' },
    { id: 'Varela Round', name: 'Varela' },
    { id: 'Secular One', name: 'Secular' }
];

const TEXT_STYLES = [
    { id: 'none', name: 'Plain' },
    { id: 'background', name: 'Bubble' },
    { id: 'outline', name: 'Outline' }
];

export default function SharedCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState<'brush' | 'text' | 'eraser' | 'scroll'>('brush');
    const [brushType, setBrushType] = useState('solid');
    const [color, setColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(10);
    const [fontFamily, setFontFamily] = useState('Assistant');
    const [textStyle, setTextStyle] = useState('none');
    
    // Ownership state
    const [visitorId, setVisitorId] = useState<string>('');
    const [elements, setElements] = useState<CanvasElement[]>([]);
    const [, setSyncStatus] = useState<'loading' | 'saved' | 'error'>('loading');
    const [undoStack, setUndoStack] = useState<HistoryEntry[]>([]);
    const [redoStack, setRedoStack] = useState<HistoryEntry[]>([]);
    const isDrawingRef = useRef(false);
    const isTextEditingRef = useRef(false);
    const remoteSyncPauseUntilRef = useRef(0);
    const currentPathRef = useRef<Point[]>([]);
    const activeStrokeRef = useRef<Omit<CanvasElement, 'id' | 'type' | 'points'> | null>(null);
    const liveStrokeFrameRef = useRef<number | null>(null);
    const renderedPointCountRef = useRef(0);
    
    // UI state
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [activeSubMenu, setActiveSubMenu] = useState<'brush' | 'text' | 'size' | null>(null);
    
    // Text tool state
    const [textInput, setTextInput] = useState({ 
        active: false, 
        id: '', // To keep track if we're editing an existing element
        x: 0, 
        y: 0, 
        width: 300,
        value: '' 
    });
    const textInputRef = useRef<HTMLTextAreaElement>(null);
    const [isCanvasVisible, setIsCanvasVisible] = useState(false);
    const [showCanvasScrollTop, setShowCanvasScrollTop] = useState(false);

    // Initialize visitorId
    useEffect(() => {
        let id = localStorage.getItem('canvas_visitor_id');
        if (!id) {
            id = Math.random().toString(36).substring(2, 15);
            localStorage.setItem('canvas_visitor_id', id);
        }
        setVisitorId(id);
    }, []);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => setIsCanvasVisible(entry.isIntersecting),
            { threshold: 0.1 }
        );
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const updateCanvasScrollTopVisibility = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;
        const top = el.getBoundingClientRect().top;
        setShowCanvasScrollTop(-top >= window.innerHeight);
    }, []);

    useEffect(() => {
        updateCanvasScrollTopVisibility();
        window.addEventListener('scroll', updateCanvasScrollTopVisibility, { passive: true });
        window.addEventListener('resize', updateCanvasScrollTopVisibility);
        return () => {
            window.removeEventListener('scroll', updateCanvasScrollTopVisibility);
            window.removeEventListener('resize', updateCanvasScrollTopVisibility);
        };
    }, [updateCanvasScrollTopVisibility]);

    const scrollToCanvasTop = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;
        const y = el.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: y, behavior: 'smooth' });
    }, []);

    const drawPath = useCallback((ctx: CanvasRenderingContext2D, element: Partial<CanvasElement>) => {
        if (!element.points || element.points.length === 0) return;
        
        ctx.save();
        ctx.strokeStyle = element.color || '#000000';
        ctx.fillStyle = element.color || '#000000';
        ctx.lineWidth = element.brushSize || 10;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        switch (element.brushType) {
            case 'glow':
                ctx.shadowBlur = (element.brushSize || 10) * 1.5;
                ctx.shadowColor = element.color || '#000000';
                break;
            case 'spray':
                ctx.globalAlpha = 0.2;
                break;
            case 'marker':
                ctx.globalAlpha = 0.6;
                ctx.lineCap = 'butt';
                break;
        }

        if (element.points.length === 1) {
            const point = element.points[0];
            const radius = Math.max((element.brushSize || 10) / 2, 1);
            ctx.beginPath();
            ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            return;
        }

        if (element.brushType === 'spray') {
            element.points.forEach(p => {
                for (let i = 0; i < 5; i++) {
                    const offsetX = (Math.random() - 0.5) * (element.brushSize || 10) * 2;
                    const offsetY = (Math.random() - 0.5) * (element.brushSize || 10) * 2;
                    ctx.fillRect(p.x + offsetX, p.y + offsetY, 1, 1);
                }
            });
        } else if (element.brushType === 'calligraphy') {
            for (let i = 1; i < element.points.length; i++) {
                const prev = element.points[i-1];
                const curr = element.points[i];
                ctx.beginPath();
                ctx.lineWidth = (element.brushSize || 10) * (1 - Math.abs(curr.x - prev.x) / 50);
                ctx.moveTo(prev.x, prev.y);
                ctx.lineTo(curr.x, curr.y);
                ctx.stroke();
            }
        } else {
            ctx.beginPath();
            ctx.moveTo(element.points[0].x, element.points[0].y);
            for (let i = 1; i < element.points.length; i++) {
                ctx.lineTo(element.points[i].x, element.points[i].y);
            }
            ctx.stroke();
        }
        ctx.restore();
    }, []);

    const getCanvasContext = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');

        if (!canvas || !ctx) return null;

        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        return { canvas, ctx, dpr };
    }, []);

    const drawText = useCallback((ctx: CanvasRenderingContext2D, element: CanvasElement) => {
        if (!element.value || element.x === undefined || element.y === undefined) return;
        
        ctx.save();
        const fontSize = element.brushSize * 3;
        ctx.font = `bold ${fontSize}px "${element.fontFamily}", cursive`;
        ctx.textBaseline = 'top';
        
        const lineHeight = fontSize * 1.2;
        const padding = fontSize * 0.4;
        const maxWidth = element.width || 300;
        
        // Wrapping logic
        const paragraphs = element.value.split('\n');
        const lines: string[] = [];
        
        paragraphs.forEach(paragraph => {
            const words = paragraph.split(' ');
            let currentLine = '';
            
            words.forEach(word => {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                const testWidth = ctx.measureText(testLine).width;
                if (testWidth > maxWidth && currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            });
            lines.push(currentLine);
        });

        if (element.textStyle === 'background') {
            ctx.fillStyle = element.color;
            ctx.beginPath();
            if (typeof ctx.roundRect === 'function') {
                ctx.roundRect(
                    element.x, 
                    element.y, 
                    maxWidth + padding * 2, 
                    (lineHeight * lines.length) + padding,
                    12
                );
            } else {
                ctx.rect(
                    element.x, 
                    element.y, 
                    maxWidth + padding * 2, 
                    (lineHeight * lines.length) + padding
                );
            }
            ctx.fill();
            ctx.fillStyle = '#ffffff';
        } else {
            ctx.fillStyle = element.color;
        }

        lines.forEach((line, i) => {
            const yOffset = i * lineHeight;
            const textX = element.x! + (element.textStyle === 'background' ? padding : 0);
            const textY = element.y! + (element.textStyle === 'background' ? fontSize * 0.2 : 0) + yOffset;
            
            if (element.textStyle === 'outline') {
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = fontSize * 0.1;
                ctx.strokeText(line, textX, textY);
            }
            ctx.fillText(line, textX, textY);
        });
        
        ctx.restore();
    }, []);

    const redraw = useCallback(() => {
        const context = getCanvasContext();
        if (!context) return;

        const { canvas, ctx, dpr } = context;

        // Clear canvas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);

        elements.forEach(element => {
            if (element.type === 'path' && element.points) {
                drawPath(ctx, element);
            } else if (element.type === 'text') {
                drawText(ctx, element);
            }
        });

        if (isDrawingRef.current && activeStrokeRef.current && currentPathRef.current.length > 0) {
            drawPath(ctx, {
                ...activeStrokeRef.current,
                points: currentPathRef.current,
            });
        }
    }, [drawPath, drawText, elements, getCanvasContext]);

    const drawLatestLiveStroke = useCallback(() => {
        liveStrokeFrameRef.current = null;

        const context = getCanvasContext();
        if (!context || !activeStrokeRef.current) return;

        const { ctx } = context;
        const points = currentPathRef.current;

        if (points.length === 0) return;

        if (renderedPointCountRef.current === 0) {
            drawPath(ctx, {
                ...activeStrokeRef.current,
                points: [points[0]],
            });
            renderedPointCountRef.current = 1;
        }

        for (let i = Math.max(1, renderedPointCountRef.current); i < points.length; i++) {
            drawPath(ctx, {
                ...activeStrokeRef.current,
                points: [points[i - 1], points[i]],
            });
        }

        renderedPointCountRef.current = points.length;
    }, [drawPath, getCanvasContext]);

    const requestLiveStrokeDraw = useCallback(() => {
        if (liveStrokeFrameRef.current !== null) return;
        liveStrokeFrameRef.current = window.requestAnimationFrame(drawLatestLiveStroke);
    }, [drawLatestLiveStroke]);

    const initCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const dpr = window.devicePixelRatio || 1;
        const maxCss = Math.max(1, Math.floor(MAX_BACKING_DIMENSION / dpr) - 1);

        let cssWidth = window.innerWidth;
        if (cssWidth > maxCss) cssWidth = maxCss;

        const cssHeight = Math.min(CANVAS_HEIGHT, maxCss);

        canvas.width = Math.round(cssWidth * dpr);
        canvas.height = Math.round(cssHeight * dpr);
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;

        redraw();
    }, [redraw]);

    useEffect(() => {
        initCanvas();
        const handleResize = () => initCanvas();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [initCanvas]);

    useEffect(() => {
        return () => {
            if (liveStrokeFrameRef.current !== null) {
                window.cancelAnimationFrame(liveStrokeFrameRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Assistant:wght@400;700&family=Heebo:wght@400;700&family=Rubik:wght@400;700&family=Varela+Round&family=Secular+One&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);

        return () => {
            document.head.removeChild(link);
        };
    }, []);

    useEffect(() => {
        redraw();
    }, [redraw]);

    useEffect(() => {
        if (textInput.active && textInputRef.current) {
            textInputRef.current.focus();
            // Adjust height if font size/content changed
            textInputRef.current.style.height = 'auto';
            textInputRef.current.style.height = textInputRef.current.scrollHeight + 'px';
        }
    }, [textInput.active, brushSize, fontFamily, textInput.value]);

    useEffect(() => {
        isDrawingRef.current = isDrawing;
    }, [isDrawing]);

    useEffect(() => {
        isTextEditingRef.current = textInput.active;
    }, [textInput.active]);

    const getCoordinates = (clientX: number, clientY: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();

        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const getTextBounds = (element: CanvasElement) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !element.value || element.x === undefined || element.y === undefined) return { width: 0, height: 0 };
        
        const fontSize = element.brushSize * 3;
        ctx.font = `bold ${fontSize}px "${element.fontFamily}", cursive`;
        const lineHeight = fontSize * 1.2;
        const padding = fontSize * 0.4;
        const maxWidth = element.width || 300;
        
        // Wrapping logic (same as drawText)
        const paragraphs = element.value.split('\n');
        const lines: string[] = [];
        paragraphs.forEach(paragraph => {
            const words = paragraph.split(' ');
            let currentLine = '';
            words.forEach(word => {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                const testWidth = ctx.measureText(testLine).width;
                if (testWidth > maxWidth && currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            });
            lines.push(currentLine);
        });
        
        return { 
            width: maxWidth + (element.textStyle === 'background' ? padding * 2 : 0), 
            height: (lineHeight * lines.length) + (element.textStyle === 'background' ? padding : 0)
        };
    };

    const pauseRemoteSync = useCallback((durationMs = 5000) => {
        remoteSyncPauseUntilRef.current = Date.now() + durationMs;
    }, []);

    const loadCanvas = useCallback(async ({ force = false, silent = false } = {}) => {
        const shouldSkipSync =
            !force &&
            (Date.now() < remoteSyncPauseUntilRef.current || isDrawingRef.current || isTextEditingRef.current);

        if (shouldSkipSync) return;

        if (!silent) setSyncStatus('loading');

        try {
            const response = await fetch('/api/canvas', { cache: 'no-store' });
            if (!response.ok) throw new Error(`Canvas fetch failed with ${response.status}`);

            const data = await response.json();
            setElements(Array.isArray(data.elements) ? data.elements : []);
            setSyncStatus('saved');
        } catch (error) {
            console.error('Failed to load canvas', error);
            setSyncStatus('error');
        }
    }, []);

    const persistCanvasChange = useCallback(async (body: { action: 'upsert'; payload: CanvasElement } | { action: 'delete'; id: string; ownerId: string }) => {
        pauseRemoteSync();
        setSyncStatus('loading');

        try {
            const response = await fetch('/api/canvas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                throw new Error(`Canvas save failed with ${response.status}`);
            }

            await loadCanvas({ force: true, silent: true });
            setSyncStatus('saved');
        } catch (error) {
            console.error('Failed to save canvas change', error);
            setSyncStatus('error');
        }
    }, [loadCanvas, pauseRemoteSync]);

    const upsertElementLocally = useCallback((element: CanvasElement) => {
        setElements(prev => {
            const existingIndex = prev.findIndex(el => el.id === element.id);
            if (existingIndex === -1) {
                return [...prev, element];
            }

            return prev.map(el => el.id === element.id ? element : el);
        });
    }, []);

    const removeElementLocally = useCallback((id: string) => {
        setElements(prev => prev.filter(el => el.id !== id));
    }, []);

    const pushHistory = useCallback((entry: HistoryEntry) => {
        setUndoStack(prev => [...prev, entry]);
        setRedoStack([]);
    }, []);

    const selectTool = useCallback((nextTool: 'brush' | 'text' | 'eraser' | 'scroll', subMenu: 'brush' | 'text' | 'size' | null = null) => {
        setTool(nextTool);
        setActiveSubMenu(subMenu);
        setShowColorPicker(false);
    }, []);

    const applyHistoryEntry = useCallback(async (entry: HistoryEntry, direction: 'undo' | 'redo') => {
        if (entry.type === 'create') {
            if (direction === 'undo') {
                removeElementLocally(entry.element.id);
                await persistCanvasChange({ action: 'delete', id: entry.element.id, ownerId: entry.element.ownerId });
            } else {
                upsertElementLocally(entry.element);
                await persistCanvasChange({ action: 'upsert', payload: entry.element });
            }
            return;
        }

        if (entry.type === 'delete') {
            if (direction === 'undo') {
                upsertElementLocally(entry.element);
                await persistCanvasChange({ action: 'upsert', payload: entry.element });
            } else {
                removeElementLocally(entry.element.id);
                await persistCanvasChange({ action: 'delete', id: entry.element.id, ownerId: entry.element.ownerId });
            }
            return;
        }

        const element = direction === 'undo' ? entry.before : entry.after;
        upsertElementLocally(element);
        await persistCanvasChange({ action: 'upsert', payload: element });
    }, [persistCanvasChange, removeElementLocally, upsertElementLocally]);

    const handleUndo = useCallback(() => {
        const entry = undoStack[undoStack.length - 1];
        if (!entry) return;

        setUndoStack(prev => prev.slice(0, -1));
        setRedoStack(prev => [...prev, entry]);
        void applyHistoryEntry(entry, 'undo');
    }, [applyHistoryEntry, undoStack]);

    const handleRedo = useCallback(() => {
        const entry = redoStack[redoStack.length - 1];
        if (!entry) return;

        setRedoStack(prev => prev.slice(0, -1));
        setUndoStack(prev => [...prev, entry]);
        void applyHistoryEntry(entry, 'redo');
    }, [applyHistoryEntry, redoStack]);

    const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!visitorId) return;
        if (tool === 'scroll') return;

        const { x, y } = getCoordinates(e.clientX, e.clientY);

        if (tool === 'text') {
            if (textInput.active) {
                if (textInput.value.trim()) {
                    placeText();
                } else {
                    setTextInput({ active: false, id: '', x: 0, y: 0, width: 300, value: '' });
                }
            } else {
                // Check if we clicked on an existing text element we own to edit it
                const clickedElement = elements.find(el => {
                    if (el.type !== 'text' || el.ownerId !== visitorId) return false;
                    const { width, height } = getTextBounds(el);
                    return x >= (el.x || 0) && x <= (el.x || 0) + width &&
                           y >= (el.y || 0) && y <= (el.y || 0) + height;
                });

                if (clickedElement) {
                    setTextInput({ 
                        active: true, 
                        id: clickedElement.id, 
                        x: clickedElement.x || 0, 
                        y: clickedElement.y || 0, 
                        width: clickedElement.width || 300,
                        value: clickedElement.value || '' 
                    });
                } else {
                    setTextInput({ active: true, id: '', x, y, width: 300, value: '' });
                }
                e.stopPropagation();
            }
            return;
        }

        if (tool === 'eraser') {
            e.preventDefault();
            const elementToErase = elements.find(el => {
                if (el.ownerId !== visitorId) return false;
                if (el.type === 'text') {
                    const { width, height } = getTextBounds(el);
                    return x >= (el.x || 0) && x <= (el.x || 0) + width &&
                           y >= (el.y || 0) && y <= (el.y || 0) + height;
                } else {
                    return el.points?.some(p => Math.hypot(p.x - x, p.y - y) < brushSize);
                }
            });

            if (elementToErase) {
                removeElementLocally(elementToErase.id);
                pushHistory({ type: 'delete', element: elementToErase });
                void persistCanvasChange({ action: 'delete', id: elementToErase.id, ownerId: elementToErase.ownerId });
            }
            return;
        }

        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        setIsDrawing(true);
        pauseRemoteSync();
        currentPathRef.current = [{ x, y }];
        activeStrokeRef.current = {
            color,
            brushSize,
            brushType,
            ownerId: visitorId,
        };
        renderedPointCountRef.current = 0;
        requestLiveStrokeDraw();
    };

    const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawingRef.current || tool !== 'brush') return;
        
        e.preventDefault();
        const { x, y } = getCoordinates(e.clientX, e.clientY);
        const points = currentPathRef.current;
        const lastPoint = points[points.length - 1];

        if (lastPoint && lastPoint.x === x && lastPoint.y === y) return;

        points.push({ x, y });
        requestLiveStrokeDraw();
    };

    const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (tool === 'brush' && isDrawingRef.current) {
            e.preventDefault();

            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId);
            }

            if (liveStrokeFrameRef.current !== null) {
                window.cancelAnimationFrame(liveStrokeFrameRef.current);
                drawLatestLiveStroke();
            }

            const points = [...currentPathRef.current];

            if (points.length === 0 || !activeStrokeRef.current) {
                setIsDrawing(false);
                currentPathRef.current = [];
                activeStrokeRef.current = null;
                renderedPointCountRef.current = 0;
                return;
            }

            const newElement: CanvasElement = {
                id: Math.random().toString(36).substring(2, 15),
                type: 'path',
                points,
                ...activeStrokeRef.current,
            };
            upsertElementLocally(newElement);
            pushHistory({ type: 'create', element: newElement });
            void persistCanvasChange({ action: 'upsert', payload: newElement });
            setIsDrawing(false);
            currentPathRef.current = [];
            activeStrokeRef.current = null;
            renderedPointCountRef.current = 0;
        }
        
        if (tool === 'text' && textInput.active && textInputRef.current) {
            textInputRef.current.focus();
        }
    };

    const placeText = () => {
        if (!visitorId) return;

        if (!textInput.value.trim()) {
            if (textInput.id) {
                // If editing an existing one and cleared it, remove it
                const existingElement = elements.find(el => el.id === textInput.id);
                removeElementLocally(textInput.id);
                if (existingElement) {
                    pushHistory({ type: 'delete', element: existingElement });
                    void persistCanvasChange({ action: 'delete', id: textInput.id, ownerId: existingElement.ownerId });
                }
            }
            setTextInput({ active: false, id: '', x: 0, y: 0, width: 300, value: '' });
            return;
        }

        const newElement: CanvasElement = {
            id: textInput.id || Math.random().toString(36).substring(2, 15),
            type: 'text',
            x: textInput.x,
            y: textInput.y,
            width: textInputRef.current?.offsetWidth || textInput.width,
            value: textInput.value,
            color,
            brushSize,
            fontFamily,
            textStyle,
            ownerId: visitorId
        };

        const previousElement = textInput.id ? elements.find(el => el.id === textInput.id) : undefined;

        if (textInput.id) {
            upsertElementLocally(newElement);
            if (previousElement) {
                pushHistory({ type: 'update', before: previousElement, after: newElement });
            } else {
                pushHistory({ type: 'create', element: newElement });
            }
        } else {
            upsertElementLocally(newElement);
            pushHistory({ type: 'create', element: newElement });
        }
        void persistCanvasChange({ action: 'upsert', payload: newElement });
        
        setTextInput({ active: false, id: '', x: 0, y: 0, width: 300, value: '' });
    };

    const downloadCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const link = document.createElement('a');
        link.download = `danielle-birthday-canvas-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    const toggleSubMenu = (menu: 'brush' | 'text' | 'size' | null) => {
        setActiveSubMenu(activeSubMenu === menu ? null : menu);
        setShowColorPicker(false);
    };

    const toggleColorPicker = () => {
        setShowColorPicker(!showColorPicker);
        setActiveSubMenu(null);
    };

    useEffect(() => {
        void loadCanvas({ force: true });

        const intervalId = window.setInterval(() => {
            void loadCanvas({ silent: true });
        }, 3000);

        return () => window.clearInterval(intervalId);
    }, [loadCanvas]);

    const deleteElement = useCallback((element: CanvasElement) => {
        removeElementLocally(element.id);
        pushHistory({ type: 'delete', element });
        void persistCanvasChange({ action: 'delete', id: element.id, ownerId: element.ownerId });
    }, [persistCanvasChange, pushHistory, removeElementLocally]);

    return (
        <div className={styles.container} ref={containerRef}>
            {isCanvasVisible && (
            <div className={styles.toolbarCluster}>
                {showCanvasScrollTop && (
                    <button
                        type="button"
                        className={styles.scrollToToolbarBtn}
                        onClick={scrollToCanvasTop}
                        title="Scroll to top of canvas"
                        aria-label="Scroll to top of canvas"
                    >
                        <ChevronUp size={22} aria-hidden />
                        <span className={styles.scrollToToolbarLabel}>Canvas top</span>
                    </button>
                )}
            <div className={styles.toolbar}>
                    {activeSubMenu === 'brush' && tool === 'brush' && (
                    <div className={styles.subMenu}>
                        {BRUSH_TYPES.map(bt => (
                            <button 
                                key={bt.id}
                                onClick={() => {
                                    setBrushType(bt.id);
                                    setActiveSubMenu(null);
                                }}
                                className={`${styles.optionBtn} ${brushType === bt.id ? styles.activeOption : ''}`}
                            >
                                <span>{bt.icon}</span> {bt.name}
                            </button>
                        ))}
                    </div>
                )}

                {activeSubMenu === 'text' && tool === 'text' && (
                    <div className={styles.subMenu}>
                        <div className={styles.subMenuSection}>
                            <span className={styles.subMenuLabel}>Font:</span>
                            <div className={styles.optionGrid}>
                                {FONTS.map(f => (
                                    <button 
                                        key={f.id}
                                        onClick={() => setFontFamily(f.id)}
                                        className={`${styles.optionBtn} ${fontFamily === f.id ? styles.activeOption : ''}`}
                                        style={{ fontFamily: f.id }}
                                    >
                                        {f.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className={styles.subMenuSection}>
                            <span className={styles.subMenuLabel}>Style:</span>
                            <div className={styles.optionGrid}>
                                {TEXT_STYLES.map(ts => (
                                    <button 
                                        key={ts.id}
                                        onClick={() => setTextStyle(ts.id)}
                                        className={`${styles.optionBtn} ${textStyle === ts.id ? styles.activeOption : ''}`}
                                    >
                                        {ts.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeSubMenu === 'size' && (
                    <div className={styles.subMenu}>
                        <div className={styles.sizeControl}>
                            <span className={styles.sizeLabel}>Size: {brushSize}</span>
                            <input 
                                type="range" 
                                min="2" 
                                max="100" 
                                value={brushSize} 
                                onChange={(e) => setBrushSize(parseInt(e.target.value))} 
                                className={styles.sizeSlider}
                            />
                        </div>
                    </div>
                )}

                {showColorPicker && (
                    <div className={styles.colorPicker}>
                        <div className={styles.colorGrid}>
                            {COLORS.map(c => (
                                <button 
                                    key={c}
                                    onClick={() => {
                                        setColor(c);
                                        setShowColorPicker(false);
                                    }}
                                    className={`${styles.colorBtn} ${color === c ? styles.activeColor : ''}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>
                )}

                <div className={styles.mainToolbar}>
                    <div className={styles.toolGroup}>
                        <button 
                            onClick={() => {
                                selectTool('brush', activeSubMenu === 'brush' && tool === 'brush' ? null : 'brush');
                            }} 
                            className={`${styles.toolBtn} ${tool === 'brush' ? styles.active : ''}`}
                            title="Brush"
                        >
                            <Paintbrush size={24} />
                        </button>
                        <button 
                            onClick={() => {
                                selectTool('text', activeSubMenu === 'text' && tool === 'text' ? null : 'text');
                            }} 
                            className={`${styles.toolBtn} ${tool === 'text' ? styles.active : ''}`}
                            title="Text"
                        >
                            <Type size={24} />
                        </button>
                        <button 
                            onClick={() => {
                                selectTool('eraser');
                            }} 
                            className={`${styles.toolBtn} ${tool === 'eraser' ? styles.active : ''}`}
                            title="Eraser (Only your art)"
                        >
                            <Eraser size={24} />
                        </button>
                        <button
                            onClick={() => selectTool('scroll')}
                            className={`${styles.toolBtn} ${tool === 'scroll' ? styles.active : ''}`}
                            title="Scroll"
                        >
                            <Hand size={24} />
                        </button>
                    </div>

                    <div className={styles.toolGroup}>
                        <button 
                            onClick={toggleColorPicker}
                            className={styles.colorTrigger}
                            style={{ backgroundColor: color }}
                        />
                        <button 
                            onClick={() => toggleSubMenu('size')}
                            className={`${styles.toolBtn} ${activeSubMenu === 'size' ? styles.active : ''}`}
                            title="Size"
                        >
                            <div className={styles.sizeIndicator} style={{ width: Math.min(brushSize, 20), height: Math.min(brushSize, 20) }} />
                        </button>
                    </div>

                    <div className={styles.toolGroup}>
                        <button
                            onClick={handleUndo}
                            className={styles.actionBtn}
                            title="Undo your last action"
                            disabled={undoStack.length === 0}
                        >
                            <Undo2 size={24} />
                        </button>
                        <button
                            onClick={handleRedo}
                            className={styles.actionBtn}
                            title="Redo your last undone action"
                            disabled={redoStack.length === 0}
                        >
                            <Redo2 size={24} />
                        </button>
                    </div>
                </div>
            </div>
            </div>
            )}

            <div className={`${styles.canvasWrapper} ${tool === 'scroll' ? styles.canvasWrapperScrollable : ''}`}>
                <canvas
                    ref={canvasRef}
                    onPointerDown={startDrawing}
                    onPointerMove={draw}
                    onPointerUp={stopDrawing}
                    onPointerCancel={stopDrawing}
                    onPointerLeave={stopDrawing}
                    className={`${styles.mainCanvas} ${tool === 'scroll' ? styles.mainCanvasScrollable : ''}`}
                />
                
                {textInput.active && (
                    <div 
                        className={styles.textInputOverlay}
                        data-style={textStyle}
                        style={{ 
                            left: textInput.x, 
                            top: textInput.y,
                            fontFamily: fontFamily,
                            color: textStyle === 'background' ? '#ffffff' : color,
                            backgroundColor: textStyle === 'background' ? color : 'transparent',
                            fontSize: `${brushSize * 3}px`,
                            minWidth: '200px',
                            maxWidth: typeof window !== 'undefined' ? `${window.innerWidth - textInput.x - 40}px` : '100%'
                        }}
                    >
                        <textarea
                            ref={textInputRef}
                            value={textInput.value}
                            onChange={(e) => {
                                setTextInput({ ...textInput, value: e.target.value });
                                // Auto-grow height
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            onFocus={(e) => {
                                // Select all text for easy editing
                                e.target.select();
                                // Initialize height
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    placeText();
                                }
                                if (e.key === 'Escape') setTextInput({ active: false, id: '', x: 0, y: 0, width: 300, value: '' });
                            }}
                            placeholder="Type here..."
                            className={styles.inlineText}
                            autoFocus
                        />
                        <div className={styles.textActions}>
                            <button onClick={placeText} className={styles.textDone} title="Done">✓</button>
                            {textInput.id && (
                                <button 
                                    onClick={() => {
                                        const elementToDelete = elements.find(el => el.id === textInput.id);
                                        if (elementToDelete) {
                                            deleteElement(elementToDelete);
                                        }
                                        setTextInput({ active: false, id: '', x: 0, y: 0, width: 300, value: '' });
                                    }} 
                                    className={styles.textDelete} 
                                    title="Delete"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
            
            <div className={styles.infiniteBottom}>
                <p>✨ Add your touch to the birthday wall ✨</p>
                <button onClick={downloadCanvas} className={styles.downloadBtn}>
                    <Download size={22} />
                    Download PNG
                </button>
                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className={styles.scrollUp}>
                    <ChevronUp size={24} />
                    Back to Top
                </button>
            </div>
        </div>
    );
}
