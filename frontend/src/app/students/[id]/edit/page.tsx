'use client';
import { useParams } from 'next/navigation';
import StudentForm from '@/components/forms/StudentForm';

export default function EditStudentPage() {
  const { id } = useParams<{ id: string }>();
  return <StudentForm studentId={id} />;
}
