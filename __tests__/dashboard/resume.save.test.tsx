import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Packer } from 'docx';
import ResumeBuilderPage from '@/app/dashboard/resume/page';

jest.mock('@/lib/toast', () => ({
  showError: jest.fn(),
  showSuccess: jest.fn(),
}));
jest.mock('docx', () => ({
  AlignmentType: { CENTER: 'center' },
  Document: jest.fn((options) => options),
  HeadingLevel: { TITLE: 'title', HEADING_1: 'heading1' },
  Packer: { toBlob: jest.fn().mockResolvedValue(new Blob(['docx'])) },
  Paragraph: jest.fn((options) => options),
  TextRun: jest.fn((options) => options),
}));

describe('resume builder save', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as jest.Mock;
  });

  it('sends the resume to the authenticated API', async () => {
    render(<ResumeBuilderPage />);

    fireEvent.click(screen.getByRole('button', { name: /^Save$/ }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/resume',
        expect.objectContaining({ method: 'PUT' })
      );
    });

    const requestOptions = (global.fetch as jest.Mock).mock.calls[0][1];
    const resume = JSON.parse(requestOptions.body);
    expect(resume).toEqual({
      personalInfo: expect.any(Object),
      education: expect.any(Array),
      experience: expect.any(Array),
      skills: expect.any(Array),
    });
  });

  it('downloads the resume as a DOCX file', async () => {
    let downloadedFileName = '';
    Object.defineProperty(window.URL, 'createObjectURL', {
      configurable: true,
      value: jest.fn(() => 'blob:resume'),
    });
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      configurable: true,
      value: jest.fn(),
    });
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloadedFileName = this.download;
    });

    render(<ResumeBuilderPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Download DOCX' }));

    await waitFor(() => expect(Packer.toBlob).toHaveBeenCalled());
    expect(downloadedFileName).toBe('my-resume.docx');
    clickSpy.mockRestore();
  });
});