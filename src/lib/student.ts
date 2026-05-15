export function calculateSemester(email: string, usn: string): number | null {
    // Year extracted from USN or email
    const yearMatch = usn?.match(/\d{2}/) || email?.match(/\d{2}/);
    if (!yearMatch) return null;

    const admissionYear = parseInt(yearMatch[0]) + 2000;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed, 0=Jan, 6=July

    // If we are in the first half of the year (Jan-June), it's even semester
    // If in second half (July-Dec), it's odd semester
    let semester = (currentYear - admissionYear) * 2;
    if (currentMonth >= 6) {
        semester += 1;
    }

    return semester > 0 ? semester : 1;
}
