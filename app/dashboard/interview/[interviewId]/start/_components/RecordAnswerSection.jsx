import React, { useEffect, useState } from 'react'
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
    const {
        isRecording,
        results,
        startSpeechToText,
        stopSpeechToText,
        setResults
    } = useSpeechToText({
        continuous: true,
        useLegacyResults: false
    });

    useEffect(() => {
        const newAnswer = results.reduce((acc, result) => acc + result.transcript, '');
        setUserAnswer(prevAns => prevAns + newAnswer);
    }, [results]);

    useEffect(() => {
        if (!isRecording && userAnswer.length > 10) {
            UpdateUserAnswer();
        }
    }, [isRecording, userAnswer]);

    const StartStopRecording = async () => {
        try {
            if (isRecording) {
                await stopSpeechToText();
            } else {
                await startSpeechToText();
            }
        } catch (error) {
            console.error('Error toggling speech recognition:', error);
            toast.error('Failed to toggle speech recognition. Please check your microphone permissions.');
        }
    };

    const UpdateUserAnswer = async () => {
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

            toast('User Answer recorded successfully');
            setUserAnswer('');
            setResults([]);
        } catch (error) {
            console.error('Error updating user answer:', error);
            toast.error('Failed to record user answer');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='flex items-center justify-center flex-col'>
            <div className='flex flex-col mt-20 justify-center items-center bg-black rounded-lg p-5'>
                <Image src='/webcam.png' width={200} height={200} alt="Webcam" className='absolute' />
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