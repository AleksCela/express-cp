import express from "express";
import cors from "cors";
import database from "../src/databaseConnectivity.js";

const app = express();
app.use(express.json());
app.use(
    cors({
        origin: "*",
    })
);
app.use("/", express.static("./public", { extensions: ["html"] }));

app.get('/students', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 5;

        const offset = (page - 1) * pageSize;

        const students = await database('Student')
            .select('*')
            .limit(pageSize)
            .offset(offset);

        for (const student of students) {
            const courses = await database('Course')
                .where('student_id', student.id)
                .select('*');

            student.courses = courses.map(course => ({
                ...course,
                subscribed: course.subscribed === 1 ? true : false
            }));
        }

        const totalStudents = await database('Student').count('* as total');
        const total = totalStudents[0].total;

        res.json({
            students,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize)
        });
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.get('/students/:NID', async (req, res) => {
    const { NID } = req.params;

    try {
        const student = await database('Student').where('NID', NID).first();
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        const courses = await database('Course')
            .where('student_id', student.id)
            .select('*');
        student.courses = courses.map(course => ({
            ...course,
            subscribed: course.subscribed === 1 ? true : false
        }));

        res.json(student);
    } catch (error) {
        console.error('Error fetching student:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});




app.delete('/students/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const student = await database('Student').where('id', id).first();
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }
        await database('Course').where('student_id', id).del();
        await database('Student').where('id', id).del();
        res.json({ message: 'Student and associated courses deleted successfully' });
    } catch (error) {
        console.error('Error deleting student:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/register', async (req, res) => {
    const { NID, password, name, surname } = req.body;
    if (!NID || !password) {
        return res.status(400).json({ error: 'NID and password are required' });
    }
    try {
        const existingUser = await database('student').where('NID', NID).first();
        if (existingUser) {
            return res.status(400).json({ error: 'Ju ekzistoni i rregjistruar ne rregjistrin e studenteve!' });
        }

        await database('student').insert({
            NID,
            password,
            name,
            surname
        });
        const currentDate = new Date().toISOString().slice(0, 10);
        const coursesToAdd = [
            { name: 'Mathematics', subscribed: false, otherInfo: 'Introduction to Calculus', subscribeDate: currentDate },
            { name: 'Physics', subscribed: false, otherInfo: 'Mechanics and Thermodynamics', subscribeDate: currentDate },
            { name: 'Literature', subscribed: false, otherInfo: 'World Literature', subscribeDate: currentDate },
            { name: 'History', subscribed: false, otherInfo: 'Modern World History', subscribeDate: currentDate },
            { name: 'Computer Science', subscribed: false, otherInfo: 'Introduction to Programming', subscribeDate: currentDate }
        ];

        const student_id = await database('student').select('id').where('NID', NID).first();

        for (const course of coursesToAdd) {
            await database('course').insert({
                student_id: student_id.id,
                name: course.name,
                otherInfo: course.otherInfo,
                subscribed: course.subscribed,
                subscribeDate: course.subscribeDate
            });
        }

        res.status(201).json({ message: ' Ju u rregjistruat me sukses!' });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/signin', async (req, res) => {
    const { NID, password } = req.body;

    if (!NID || !password) {
        return res.status(400).json({ error: 'NID and password are required' });
    }

    try {
        const user = await database('student').where({ NID, password }).first();
        if (!user) {
            return res.status(401).json({ error: 'Nuk ekziston perdorues me te njejtat kredenciale te studenteve!' });
        }
        res.json(user);
    } catch (error) {
        console.error('Error signing in:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/edit', async (req, res) => {
    const { NID, courses, ...updatedStudentData } = req.body;

    if (!NID) {
        return res.status(400).json({ error: 'NID is required' });
    }

    try {
        const existingStudent = await database('Student').where('NID', NID).first();
        if (!existingStudent) {
            return res.status(404).json({ error: 'Student not found' });
        }

        await database('Student').where('NID', NID).update(updatedStudentData);

        if (courses) {
            await Promise.all(courses.map(async (course) => {
                await database('Course').where('id', course.id).update({
                    subscribed: course.subscribed,
                    otherInfo: course.otherInfo,
                    subscribeDate: course.subscribeDate
                });
            }));
        }

        const updatedStudent = await database('Student').where('NID', NID).first();
        res.json(updatedStudent);
    } catch (error) {
        console.error('Error updating student:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/students/:id/courses', async (req, res) => {
    const { id } = req.params;
    const { courses } = req.body;

    try {
        const existingStudent = await database('Student').where('id', id).first();
        if (!existingStudent) {
            return res.status(404).json({ error: 'Student not found' });
        }

        for (const course of courses) {
            const newCourse = {
                ...course,
                student_id: id
            };
            await database('Course').insert(newCourse);
        }

        res.status(201).json({ message: 'Courses added successfully' });
    } catch (error) {
        console.error('Error adding courses:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});




const port = 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});