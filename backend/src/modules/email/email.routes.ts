import { Router } from 'express';
import { sendEmail } from '../../utils/email.js';

const router = Router();

router.get('/test', async (_req, res) => {
  try {
    await sendEmail({
      to: 'malikfahadkhan2450@gmail.com',
      subject: 'R&S Demo Equipment - Test Email',
      text: 'This is a test email from the R&S Demo Equipment system.',
      html: `
        <h2>R&S Demo Equipment</h2>
        <p>This is a test email.</p>
        <p>Email configuration is working correctly.</p>
      `,
    });

    res.json({
      success: true,
      message: 'Test email sent successfully',
    });
  } catch (error) {
    console.error('Test email failed:', error);

    res.status(500).json({
      success: false,
      message: 'Test email failed',
    });
  }
});

export default router;