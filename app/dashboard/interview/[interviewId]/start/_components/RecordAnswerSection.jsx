"use client"
import React, { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import Webcam from 'react-webcam'
import useSpeechToText from 'react-hook-speech-to-text'
import { Mic, StopCircle } from 'lucide-react'
import { toast } from 'sonner'
import moment from 'moment'
import { Button } from '@/components/ui/button'
import { chatSession } from '@/utils/GeminiAIModal'
import { db } from '@/utils/db'
import { UserAnswer } from '@/utils/schema'
import { useUser } from '@clerk/nextjs'

function RecordAnswerSection({ mockInterviewQuestion, activeQuestionIndex, interviewData }) {
    const [userAnswer, setUserAnswer] = useState('');
    const { user } = useUser();
    const [loading, setLoading] = useState(false);
    const [hasPermissions, setHasPermissions] = useState(false);

    const {
        isRecording,
        results,
        startSpeechToText,
        stopSpeechToText,
        setResults
    } = useSpeechToText({
        continuous: true,
        useLegacyResults: false,
        onError: (err) => {
            toast.error("Speech recognition error: " + err.message);
        }
    });

    useEffect(() => {
        checkPermissions();
    }, []);

    const checkPermissions = async () => {
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            setHasPermissions(true);
        } catch (err) {
            toast.error("Microphone permission is required");
            setHasPermissions(false);
        }
    };

    useEffect(() => {
        if (results.length > 0) {
            const newAnswer = results.reduce((acc, result) => acc + result.transcript, '');
            setUserAnswer(prev => prev + ' ' + newAnswer);
        }
    }, [results]);

    const StartStopRecording = async () => {
        if (!hasPermissions) {
            await checkPermissions();
            return;
        }

        try {
            if (isRecording) {
                await stopSpeechToText();
                await UpdateUserAnswer();
            } else {
                setResults([]);
                await startSpeechToText();
            }
        } catch (error) {
            toast.error('Failed to toggle recording');
        }
    };

    const UpdateUserAnswer = async () => {
        if (!userAnswer || userAnswer.trim().length < 10) {
            toast.error('Answer is too short');
            return;
        }

        setLoading(true);
        try {
            const feedbackPrompt = `Question: ${mockInterviewQuestion[activeQuestionIndex]?.question}, User Answer: ${userAnswer}. Based on the question and user answer, please provide a rating and feedback for improvement in 3 to 5 lines in JSON format with 'rating' and 'feedback' fields.`;

            const result = await chatSession.sendMessage(feedbackPrompt);
            const mockJsonResp = result.response.text().replace(/```json|```/g, '');
            const JsonFeedbackResp = JSON.parse(mockJsonResp);

            await db.insert(UserAnswer).values({
                mockIdRef: interviewData?.mockId,
                question: mockInterviewQuestion[activeQuestionIndex]?.question,
                correctAns: mockInterviewQuestion[activeQuestionIndex]?.answer,
                userAns: userAnswer,
                feedback: JsonFeedbackResp?.feedback,
                rating: JsonFeedbackResp?.rating,
                userEmail: user?.primaryEmailAddress?.emailAddress,
                createdAt: moment().format('DD-MM-YYYY')
            });

            toast.success('Answer recorded successfully');
            setUserAnswer('');
            setResults([]);
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to process answer');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='flex items-center justify-center flex-col'>
            <div className='flex flex-col mt-20 justify-center items-center bg-black rounded-lg p-5'>
                <Image
                    src='/webcam.png'
                    width={200}
                    height={200}
                    alt="Webcam"
                    className='absolute'
                />
                <Webcam
                    mirrored={true}
                    style={{
                        height: 500,
                        width: 500,
                        zIndex: 10,
                    }}
                />
            </div>
            <Button
                disabled={loading}
                variant="outline"
                className="my-10"
                onClick={StartStopRecording}
            >
                {isRecording ? (
                    <h2 className='text-red-600 animate-pulse flex gap-2 items-center'>
                        <StopCircle />Stop Recording
                    </h2>
                ) : (
                    <h2 className='text-primary flex gap-2 items-center'>
                        <Mic />Record Answer
                    </h2>
                )}
            </Button>
            {userAnswer && (
                <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                    <h3 className="font-bold">Your Answer:</h3>
                    <p>{userAnswer}</p>
                </div>
            )}
        </div>
    );
}

export default RecordAnswerSection;