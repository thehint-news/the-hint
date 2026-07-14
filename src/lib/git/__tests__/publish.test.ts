import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gitService, GitOperationError } from '../service';

vi.mock('octokit', () => {
    class MockOctokit {
        rest = {
            git: {
                getRef: vi.fn(),
                getCommit: vi.fn(),
                createTree: vi.fn(),
                createCommit: vi.fn(),
                updateRef: vi.fn(),
            },
            repos: {
                getContent: vi.fn(),
                deleteFile: vi.fn(),
            }
        };
    }
    return { Octokit: MockOctokit };
});

describe('GitService Publish Pipeline', () => {
    let octokitMock: { rest: { git: Record<string, import('vitest').Mock>; repos: Record<string, import('vitest').Mock> } };

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.GIT_TOKEN = 'test-token';
        process.env.GIT_REPO_OWNER = 'test-owner';
        process.env.GIT_REPO_NAME = 'test-repo';
        octokitMock = (gitService as unknown as { octokit: typeof octokitMock }).octokit;
    });

    it('should successfully commit files inline', async () => {
        octokitMock.rest.git.getRef.mockResolvedValue({ data: { object: { sha: 'sha123' } } });
        octokitMock.rest.git.getCommit.mockResolvedValue({ data: { tree: { sha: 'tree123' } } });
        octokitMock.rest.git.createTree.mockResolvedValue({ data: { sha: 'newtree123' } });
        octokitMock.rest.git.createCommit.mockResolvedValue({ data: { sha: 'newcommit123' } });
        octokitMock.rest.git.updateRef.mockResolvedValue({ data: { sha: 'newcommit123' } });

        const staging = {
            pendingWrites: new Map([['src/content/politics/test.md', 'Hello World']]),
            pendingDeletes: new Set<string>()
        };

        const result = await gitService.commitFiles(['src/content/politics/test.md'], 'Publish test', staging);

        expect(result.success).toBe(true);
        expect(result.commitHash).toBe('newcommit123');
        expect(octokitMock.rest.git.createTree).toHaveBeenCalledWith(expect.objectContaining({
            tree: expect.arrayContaining([
                expect.objectContaining({ path: 'src/content/politics/test.md', content: 'Hello World' })
            ])
        }));
    });

    it('should abort and throw on optimistic concurrency conflict', async () => {
        octokitMock.rest.git.getRef.mockResolvedValue({ data: { object: { sha: 'sha123' } } });
        octokitMock.rest.git.getCommit.mockResolvedValue({ data: { tree: { sha: 'tree123' } } });
        octokitMock.rest.git.createTree.mockResolvedValue({ data: { sha: 'newtree123' } });
        octokitMock.rest.git.createCommit.mockResolvedValue({ data: { sha: 'newcommit123' } });
        
        // Mock a 422 error from updateRef (fast-forward rejected)
        const conflictError = new Error('Unprocessable Entity') as Error & { status: number };
        conflictError.status = 422;
        octokitMock.rest.git.updateRef.mockRejectedValue(conflictError);

        const staging = {
            pendingWrites: new Map([['src/content/politics/test.md', 'Hello World']]),
            pendingDeletes: new Set<string>()
        };

        await expect(gitService.commitFiles(['src/content/politics/test.md'], 'Publish test', staging))
            .rejects.toThrow(GitOperationError);
        
        try {
            await gitService.commitFiles(['src/content/politics/test.md'], 'Publish test', staging);
        } catch (e: unknown) {
            expect((e as GitOperationError).type).toBe('CONFLICT');
        }
    });

    it('should retry transient errors', async () => {
        octokitMock.rest.git.getRef.mockResolvedValue({ data: { object: { sha: 'sha123' } } });
        octokitMock.rest.git.getCommit.mockResolvedValue({ data: { tree: { sha: 'tree123' } } });
        
        const transientError = new Error('Bad Gateway') as Error & { status: number };
        transientError.status = 502;
        
        // Fails first time, succeeds second time
        octokitMock.rest.git.createTree
            .mockRejectedValueOnce(transientError)
            .mockResolvedValueOnce({ data: { sha: 'newtree123' } });
            
        octokitMock.rest.git.createCommit.mockResolvedValue({ data: { sha: 'newcommit123' } });
        octokitMock.rest.git.updateRef.mockResolvedValue({ data: { sha: 'newcommit123' } });

        const staging = {
            pendingWrites: new Map([['src/content/politics/test.md', 'Hello World']]),
            pendingDeletes: new Set<string>()
        };

        const result = await gitService.commitFiles(['src/content/politics/test.md'], 'Publish test', staging);
        
        expect(result.success).toBe(true);
        expect(octokitMock.rest.git.createTree).toHaveBeenCalledTimes(2); // Attempt + Retry
    });
});
